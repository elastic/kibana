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
  SLO_SUMMARY_COMPONENT_TEMPLATE_MAPPINGS_NAME,
  SLO_SUMMARY_COMPONENT_TEMPLATE_SETTINGS_NAME,
  SLO_SUMMARY_INDEX_TEMPLATE_NAME,
} from '../../assets/constants';
import { StoredSLO } from '../../domain/models';
import { SO_SLO_TYPE } from '../../saved_objects';

const OK = 'OK';
const NOT_OK = 'NOT_OK';

export async function getGlobalDiagnosis(
  esClient: ElasticsearchClient,
  licensing: LicensingApiRequestHandlerContext
) {
  try {
    const licenseInfo = licensing.license.toJSON();
    const userPrivileges = await esClient.security.getUserPrivileges();
    const sloResources = await getSloResourcesDiagnosis(esClient);
    const sloSummaryResources = await getSloSummaryResourcesDiagnosis(esClient);

    return {
      licenseAndFeatures: licenseInfo,
      userPrivileges,
      sloResources,
      sloSummaryResources,
    };
  } catch (error) {
    throw error;
  }
}

export async function getSloDiagnosis(
  sloId: string,
  services: { esClient: ElasticsearchClient; soClient: SavedObjectsClientContract }
) {
  const { esClient, soClient } = services;

  const sloResources = await getSloResourcesDiagnosis(esClient);
  const sloSummaryResources = await getSloSummaryResourcesDiagnosis(esClient);

  let sloSavedObject;
  try {
    sloSavedObject = await soClient.get<StoredSLO>(SO_SLO_TYPE, sloId);
  } catch (err) {
    // noop
  }

  const sloTransformStats = await esClient.transform.getTransformStats({
    transform_id: getSLOTransformId(sloId, sloSavedObject?.attributes.revision ?? 1),
  });

  return {
    sloResources,
    sloSummaryResources,
    sloSavedObject: sloSavedObject ?? NOT_OK,
    sloTransformStats,
  };
}

async function getSloResourcesDiagnosis(esClient: ElasticsearchClient) {
  try {
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
      throw err;
    }

    return {
      [SLO_INDEX_TEMPLATE_NAME]: indexTemplateExists ? OK : NOT_OK,
      [SLO_COMPONENT_TEMPLATE_MAPPINGS_NAME]: mappingsTemplateExists ? OK : NOT_OK,
      [SLO_COMPONENT_TEMPLATE_SETTINGS_NAME]: settingsTemplateExists ? OK : NOT_OK,
      [SLO_INGEST_PIPELINE_NAME]: ingestPipelineExists ? OK : NOT_OK,
    };
  } catch (err) {
    if (err.meta.statusCode === 403) {
      throw new Error('Insufficient permissions to access Elasticsearch Cluster', { cause: err });
    }
  }
}

async function getSloSummaryResourcesDiagnosis(esClient: ElasticsearchClient) {
  try {
    const indexTemplateExists = await esClient.indices.existsIndexTemplate({
      name: SLO_SUMMARY_INDEX_TEMPLATE_NAME,
    });

    const mappingsTemplateExists = await esClient.cluster.existsComponentTemplate({
      name: SLO_SUMMARY_COMPONENT_TEMPLATE_MAPPINGS_NAME,
    });

    const settingsTemplateExists = await esClient.cluster.existsComponentTemplate({
      name: SLO_SUMMARY_COMPONENT_TEMPLATE_SETTINGS_NAME,
    });

    return {
      [SLO_SUMMARY_INDEX_TEMPLATE_NAME]: indexTemplateExists ? OK : NOT_OK,
      [SLO_SUMMARY_COMPONENT_TEMPLATE_MAPPINGS_NAME]: mappingsTemplateExists ? OK : NOT_OK,
      [SLO_SUMMARY_COMPONENT_TEMPLATE_SETTINGS_NAME]: settingsTemplateExists ? OK : NOT_OK,
    };
  } catch (err) {
    if (err.meta.statusCode === 403) {
      throw new Error('Insufficient permissions to access Elasticsearch Cluster', { cause: err });
    }
  }
}
