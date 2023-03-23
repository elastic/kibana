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

export const getIndexTemplate = (
  kibanaVersion: string,
  ilmPolicyName: string,
  indexPatterns: IIndexPatternString,
  componentTemplateRefs: string[],
  totalFieldsLimit: number
): IndicesPutIndexTemplateRequest => {
  const indexMetadata: Metadata = {
    kibana: {
      version: kibanaVersion,
    },
    managed: true,
    namespace: 'default', // hard-coded to default here until we start supporting space IDs
  };

  return {
    name: indexPatterns.template,
    body: {
      index_patterns: [indexPatterns.pattern],
      composed_of: componentTemplateRefs,
      template: {
        settings: {
          auto_expand_replicas: '0-1',
          hidden: true,
          'index.lifecycle': {
            name: ilmPolicyName,
            rollover_alias: indexPatterns.alias,
          },
          'index.mapping.total_fields.limit': totalFieldsLimit,
        },
        mappings: {
          dynamic: false,
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

      // TODO - set priority of this template when we start supporting spaces
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
  logger.info(`Installing index template ${template.name}`);

  let mappings: MappingTypeMapping = {};
  try {
    // Simulate the index template to proactively identify any issues with the mapping
    const simulateResponse = await esClient.indices.simulateTemplate(template);
    mappings = simulateResponse.template.mappings;
  } catch (err) {
    logger.error(
      `Failed to simulate index template mappings for ${template.name}; not applying mappings - ${err.message}`
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
    logger.error(`Error installing index template ${template.name} - ${err.message}`);
    throw err;
  }
};
