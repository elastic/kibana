/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getIngestPipelineName,
  getLegacyIngestPipelineName,
  getLegacyRiskScoreInitScriptId,
  getLegacyRiskScoreLevelScriptId,
  getLegacyRiskScoreMapScriptId,
  getLegacyRiskScoreReduceScriptId,
  getRiskScoreInitScriptId,
  getRiskScoreLatestTransformId,
  getRiskScoreLevelScriptId,
  getRiskScoreMapScriptId,
  getRiskScorePivotTransformId,
  getRiskScoreReduceScriptId,
  getRiskScoreTagName,
  INDICES_URL,
  INGEST_PIPELINES_URL,
  RiskScoreEntity,
  RISK_SCORE_SAVED_OBJECTS_URL,
  SAVED_OBJECTS_URL,
  STORED_SCRIPTS_URL,
  TRANSFORMS_URL,
} from '../screens/entity_analytics';

export const deleteRiskScoreIndicies = (riskScoreEntity: RiskScoreEntity, spaceId = 'default') => {
  cy.request({
    method: 'POST',
    url: `${INDICES_URL}/delete`,
    body: {
      indices: [
        `ml_${riskScoreEntity}_risk_score_${spaceId}`,
        `ml_${riskScoreEntity}_risk_score_latest_${spaceId}`,
      ],
    },
    headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
    failOnStatusCode: false,
  });
};

export const deleteRiskScoreIngestPipelines = (names: string[]) => {
  cy.request({
    method: 'delete',
    url: `${INGEST_PIPELINES_URL}/${names.join(',')}`,
    headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
    failOnStatusCode: false,
  });
};

export const getTransformState = (transformId: string) => {
  return cy.request<{ transforms: Array<{ id: string; state: string }>; count: number }>({
    method: 'get',
    url: `${TRANSFORMS_URL}/transforms/${transformId}/_stats`,
    headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
  });
};

const stopTransform = (state: {
  transforms: Array<{ id: string; state: string }>;
  count: number;
}) => {
  return cy.request({
    method: 'post',
    url: `${TRANSFORMS_URL}/stop_transforms`,
    headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
    body:
      state != null && state.transforms.length > 0
        ? [
            {
              id: state.transforms[0].id,
              state: state.transforms[0].state,
            },
          ]
        : ([] as Array<{ id: string; state: string }>),
  });
};

export const deleteTransform = (transformId: string) => {
  return cy.request({
    method: 'post',
    url: `${TRANSFORMS_URL}/delete_transforms`,
    headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
    failOnStatusCode: false,
    body: {
      transformsInfo: [
        {
          id: transformId,
          state: 'stopped',
        },
      ],
      deleteDestIndex: true,
      deleteDestDataView: true,
      forceDelete: false,
    },
  });
};

const deleteTransforms = async (transformIds: string[]) => {
  const deleteSingleTransform = (transformId: string) =>
    getTransformState(transformId)
      .then(({ body: result }) => {
        return stopTransform(result);
      })
      .then(() => {
        deleteTransform(transformId);
      });

  await Promise.all(transformIds.map((transformId) => deleteSingleTransform(transformId)));
};

const deleteStoredScript = (id: string) => {
  return cy.request({
    method: 'delete',
    url: `${STORED_SCRIPTS_URL}/delete`,
    body: { id },
    failOnStatusCode: false,
    headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
  });
};

export const deleteStoredScripts = async (scriptIds: string[]) => {
  await Promise.all(scriptIds.map((scriptId) => deleteStoredScript(scriptId)));
};

export const deleteSavedObjects = (
  templateName: `${RiskScoreEntity}RiskScoreDashboards`,
  deleteAll: boolean
) => {
  return cy.request({
    method: 'post',
    url: `${RISK_SCORE_SAVED_OBJECTS_URL}/_bulk_delete/${templateName}`,
    failOnStatusCode: false,
    body: {
      deleteAll,
    },
    headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
  });
};

export const createSavedObjects = (templateName: `${RiskScoreEntity}RiskScoreDashboards`) => {
  return cy.request({
    method: 'post',
    url: `${RISK_SCORE_SAVED_OBJECTS_URL}/_bulk_create/${templateName}`,
    failOnStatusCode: false,
    headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
  });
};

export const findSavedObjects = (riskScoreEntity: RiskScoreEntity, spaceId = 'default') => {
  const search = getRiskScoreTagName(riskScoreEntity, spaceId);

  const getReference = (tagId: string) => encodeURIComponent(`[{"type":"tag","id":"${tagId}"}]`);

  return cy
    .request({
      method: 'get',
      url: `${SAVED_OBJECTS_URL}/_find?fields=id&type=tag&sort_field=updated_at&search=${search}&search_fields=name`,
      headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
    })
    .then((res) =>
      cy.request({
        method: 'get',
        url: `${SAVED_OBJECTS_URL}/_find?fields=id&type=index-pattern&type=tag&type=visualization&type=dashboard&type=lens&sort_field=updated_at&has_reference=${getReference(
          res.body.saved_objects[0].id
        )}`,
        headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
      })
    );
};

/**
 * @deleteAll: If set to true, it deletes both old and new version.
 * If set to false, it deletes legacy version only.
 */
export const deleteRiskScore = async ({
  riskScoreEntity,
  spaceId,
  deleteAll,
}: {
  riskScoreEntity: RiskScoreEntity;
  spaceId?: string;
  deleteAll: boolean;
}) => {
  const transformIds = [
    getRiskScorePivotTransformId(riskScoreEntity, spaceId),
    getRiskScoreLatestTransformId(riskScoreEntity, spaceId),
  ];
  const legacyIngestPipelineNames = [getLegacyIngestPipelineName(riskScoreEntity)];
  const ingestPipelinesNames = deleteAll
    ? [...legacyIngestPipelineNames, getIngestPipelineName(riskScoreEntity, spaceId)]
    : legacyIngestPipelineNames;

  const legacyScriptIds = [
    ...(riskScoreEntity === RiskScoreEntity.host
      ? [getLegacyRiskScoreInitScriptId(riskScoreEntity)]
      : []),
    getLegacyRiskScoreLevelScriptId(riskScoreEntity),
    getLegacyRiskScoreMapScriptId(riskScoreEntity),
    getLegacyRiskScoreReduceScriptId(riskScoreEntity),
  ];
  const scripts = deleteAll
    ? [
        ...legacyScriptIds,
        ...(riskScoreEntity === RiskScoreEntity.host
          ? [getRiskScoreInitScriptId(riskScoreEntity, spaceId)]
          : []),
        getRiskScoreLevelScriptId(riskScoreEntity, spaceId),
        getRiskScoreMapScriptId(riskScoreEntity, spaceId),
        getRiskScoreReduceScriptId(riskScoreEntity, spaceId),
      ]
    : legacyScriptIds;

  await deleteTransforms(transformIds);
  deleteRiskScoreIngestPipelines(ingestPipelinesNames);
  deleteStoredScripts(scripts);
  deleteSavedObjects(`${riskScoreEntity}RiskScoreDashboards`, deleteAll);
  deleteRiskScoreIndicies(riskScoreEntity, spaceId);
};
