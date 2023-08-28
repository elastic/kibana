/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
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
  SLO_SUMMARY_TRANSFORM_NAME_PREFIX,
} from '../../assets/constants';
import { SLO } from '../../domain/models';
import { SLORepository } from './slo_repository';

const OK = 'OK';
const NOT_OK = 'NOT_OK';

export async function getGlobalDiagnosis(
  esClient: ElasticsearchClient,
  licensing: LicensingApiRequestHandlerContext
) {
  const licenseInfo = licensing.license.toJSON();
  const userPrivileges = await esClient.security.getUserPrivileges();
  const sloResources = await getSloResourcesDiagnosis(esClient);
  const sloSummaryResources = await getSloSummaryResourcesDiagnosis(esClient);

  const sloSummaryTransformsStats = await esClient.transform.getTransformStats({
    transform_id: `${SLO_SUMMARY_TRANSFORM_NAME_PREFIX}*`,
    allow_no_match: true,
  });

  return {
    licenseAndFeatures: licenseInfo,
    userPrivileges,
    sloResources,
    sloSummaryResources,
    sloSummaryTransformsStats,
  };
}

export async function getSloDiagnosis(
  sloId: string,
  services: { esClient: ElasticsearchClient; repository: SLORepository }
) {
  const { esClient, repository } = services;

  const sloResources = await getSloResourcesDiagnosis(esClient);
  const sloSummaryResources = await getSloSummaryResourcesDiagnosis(esClient);

  let slo: SLO | undefined;
  try {
    slo = await repository.findById(sloId);
  } catch (err) {
    // noop
  }

  const sloTransformStats = await esClient.transform.getTransformStats({
    transform_id: getSLOTransformId(sloId, slo?.revision ?? 1),
    allow_no_match: true,
  });

  const sloSummaryTransformsStats = await esClient.transform.getTransformStats({
    transform_id: `${SLO_SUMMARY_TRANSFORM_NAME_PREFIX}*`,
    allow_no_match: true,
  });

  return {
    sloResources,
    sloSummaryResources,
    slo: slo ?? NOT_OK,
    sloTransformStats,
    sloSummaryTransformsStats,
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
    if (
      err instanceof errors.ResponseError &&
      (err.statusCode === 403 || err.meta.statusCode === 403)
    ) {
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
    if (
      err instanceof errors.ResponseError &&
      (err.statusCode === 403 || err.meta.statusCode === 403)
    ) {
      throw new Error('Insufficient permissions to access Elasticsearch Cluster', { cause: err });
    }
  }
}
