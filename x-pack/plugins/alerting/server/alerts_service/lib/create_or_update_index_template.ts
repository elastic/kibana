/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IndicesPutIndexTemplateRequest,
  MappingTypeMapping,
  Metadata,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Logger, ElasticsearchClient } from '@kbn/core/server';
import { isEmpty } from 'lodash';
import { IIndexPatternString } from '../resource_installer_utils';
import { retryTransientEsErrors } from './retry_transient_es_errors';
import { DataStreamAdapter } from './data_stream_adapter';

interface GetIndexTemplateOpts {
  componentTemplateRefs: string[];
  ilmPolicyName: string;
  indexPatterns: IIndexPatternString;
  kibanaVersion: string;
  namespace: string;
  totalFieldsLimit: number;
  dataStreamAdapter: DataStreamAdapter;
}

export const getIndexTemplate = ({
  componentTemplateRefs,
  ilmPolicyName,
  indexPatterns,
  kibanaVersion,
  namespace,
  totalFieldsLimit,
  dataStreamAdapter,
}: GetIndexTemplateOpts): IndicesPutIndexTemplateRequest => {
  const indexMetadata: Metadata = {
    kibana: {
      version: kibanaVersion,
    },
    managed: true,
    namespace,
  };

  const dataStreamFields = dataStreamAdapter.getIndexTemplateFields(
    indexPatterns.alias,
    indexPatterns.pattern
  );

  const indexLifecycle = {
    name: ilmPolicyName,
    rollover_alias: dataStreamFields.rollover_alias,
  };

  return {
    name: indexPatterns.template,
    body: {
      ...(dataStreamFields.data_stream ? { data_stream: dataStreamFields.data_stream } : {}),
      index_patterns: dataStreamFields.index_patterns,
      composed_of: componentTemplateRefs,
      template: {
        settings: {
          auto_expand_replicas: '0-1',
          hidden: true,
          ...(dataStreamAdapter.isUsingDataStreams()
            ? {}
            : {
                'index.lifecycle': indexLifecycle,
              }),
          'index.mapping.ignore_malformed': true,
          'index.mapping.total_fields.limit': totalFieldsLimit,
          'index.mapping.ignore_dynamic_beyond_limit': true,
        },
        mappings: {
          dynamic: true,
          _meta: indexMetadata,
        },
        ...(indexPatterns.secondaryAlias
          ? {
              aliases: {
                [indexPatterns.secondaryAlias]: {
                  is_write_index: false,
                },
              },
            }
          : {}),
      },
      _meta: indexMetadata,

      // By setting the priority to namespace.length, we ensure that if one namespace is a prefix of another namespace
      // then newly created indices will use the matching template with the *longest* namespace
      priority: namespace.length,
    },
  };
};

interface CreateOrUpdateIndexTemplateOpts {
  logger: Logger;
  esClient: ElasticsearchClient;
  template: IndicesPutIndexTemplateRequest;
}

/**
 * Installs index template that uses installed component template
 * Prior to installation, simulates the installation to check for possible
 * conflicts. Simulate should return an empty mapping if a template
 * conflicts with an already installed template.
 */
export const createOrUpdateIndexTemplate = async ({
  logger,
  esClient,
  template,
}: CreateOrUpdateIndexTemplateOpts) => {
  logger.debug(`Installing index template ${template.name}`);

  let mappings: MappingTypeMapping = {};
  try {
    // Simulate the index template to proactively identify any issues with the mapping
    const simulateResponse = await retryTransientEsErrors(
      () => esClient.indices.simulateTemplate(template),
      { logger }
    );
    mappings = simulateResponse.template.mappings;
  } catch (err) {
    logger.error(
      `Failed to simulate index template mappings for ${template.name}; not applying mappings - ${err.message}`,
      err
    );
    return;
  }

  if (isEmpty(mappings)) {
    throw new Error(
      `No mappings would be generated for ${template.name}, possibly due to failed/misconfigured bootstrapping`
    );
  }

  try {
    await retryTransientEsErrors(() => esClient.indices.putIndexTemplate(template), {
      logger,
    });
  } catch (err) {
    logger.error(`Error installing index template ${template.name} - ${err.message}`, err);
    throw err;
  }
};
