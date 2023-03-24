/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server';

import {
  getSLOTransformId,
  SLO_COMPONENT_TEMPLATE_MAPPINGS_NAME,
  SLO_COMPONENT_TEMPLATE_SETTINGS_NAME,
  SLO_INDEX_TEMPLATE_NAME,
  SLO_INGEST_PIPELINE_NAME,
} from '../../assets/constants';
import { StoredSLO } from '../../domain/models';
import { SO_SLO_TYPE } from '../../saved_objects';

const OK = 'OK';
const NOT_OK = 'NOT_OK';

export async function getGlobalDiagnosis(
  esClient: ElasticsearchClient,
  licensing: LicensingApiRequestHandlerContext
) {
  const licenseInfo = licensing.license.toJSON();
  const userPrivileges = await esClient.security.getUserPrivileges();
  const sloResources = await getSloResourcesDiagnosis(esClient);

  return {
    licenseAndFeatures: licenseInfo,
    userPrivileges,
    sloResources,
  };
}

export async function getSloDiagnosis(
  sloId: string,
  services: { esClient: ElasticsearchClient; soClient: SavedObjectsClientContract }
) {
  const { esClient, soClient } = services;

  const sloResources = await getSloResourcesDiagnosis(esClient);

  let sloSavedObject;
  try {
    sloSavedObject = await soClient.get<StoredSLO>(SO_SLO_TYPE, sloId);
  } catch (err) {
    // noop
  }

  const sloTransformStats = await esClient.transform.getTransformStats({
    transform_id: getSLOTransformId(sloId, sloSavedObject?.attributes.revision ?? 1),
  });

  let dataSample;
  if (sloSavedObject?.attributes.indicator.params.index) {
    const slo = sloSavedObject.attributes;
    const sortField =
      'timestampField' in slo.indicator.params
        ? slo.indicator.params.timestampField ?? '@timestamp'
        : '@timestamp';
    dataSample = await esClient.search({
      index: slo.indicator.params.index,
      sort: { [sortField]: 'desc' },
      size: 5,
    });
  }

  return {
    sloResources,
    sloSavedObject: sloSavedObject ?? NOT_OK,
    sloTransformStats,
    dataSample: dataSample ?? NOT_OK,
  };
}

async function getSloResourcesDiagnosis(esClient: ElasticsearchClient) {
  const indexTemplateExists = await esClient.indices.existsIndexTemplate({
    name: SLO_INDEX_TEMPLATE_NAME,
  });

  const mappingsTemplateExists = await esClient.cluster.existsComponentTemplate({
    name: SLO_COMPONENT_TEMPLATE_MAPPINGS_NAME,
  });

  const settingsTemplateExists = await esClient.cluster.existsComponentTemplate({
    name: SLO_COMPONENT_TEMPLATE_SETTINGS_NAME,
  });

  let ingestPipelineExists = true;
  try {
    await esClient.ingest.getPipeline({ id: SLO_INGEST_PIPELINE_NAME });
  } catch (err) {
    ingestPipelineExists = false;
  }

  return {
    [SLO_INDEX_TEMPLATE_NAME]: indexTemplateExists ? OK : NOT_OK,
    [SLO_COMPONENT_TEMPLATE_MAPPINGS_NAME]: mappingsTemplateExists ? OK : NOT_OK,
    [SLO_COMPONENT_TEMPLATE_SETTINGS_NAME]: settingsTemplateExists ? OK : NOT_OK,
    [SLO_INGEST_PIPELINE_NAME]: ingestPipelineExists ? OK : NOT_OK,
  };
}
