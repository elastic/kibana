/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DEFAULT_ALERTS_INDEX = '.alerts-security.alerts' as const;
export const enum RiskScoreEntity {
  host = 'host',
  user = 'user',
}
/**
 * * Since 8.5, all the transforms, scripts,
 * and ingest pipelines (and dashboard saved objects) are created with spaceId
 * so they won't affect each other across different spaces.
 */
export const getRiskScorePivotTransformId = (
  riskScoreEntity: RiskScoreEntity,
  spaceId = 'default'
) => `ml_${riskScoreEntity}riskscore_pivot_transform_${spaceId}`;

export const getRiskScoreLatestTransformId = (
  riskScoreEntity: RiskScoreEntity,
  spaceId = 'default'
) => `ml_${riskScoreEntity}riskscore_latest_transform_${spaceId}`;

export const getIngestPipelineName = (riskScoreEntity: RiskScoreEntity, spaceId = 'default') =>
  `ml_${riskScoreEntity}riskscore_ingest_pipeline_${spaceId}`;

export const getPivotTransformIndex = (riskScoreEntity: RiskScoreEntity, spaceId = 'default') =>
  `ml_${riskScoreEntity}_risk_score_${spaceId}`;

export const getLatestTransformIndex = (riskScoreEntity: RiskScoreEntity, spaceId = 'default') =>
  `ml_${riskScoreEntity}_risk_score_latest_${spaceId}`;

export const getAlertsIndex = (spaceId = 'default') => `${DEFAULT_ALERTS_INDEX}-${spaceId}`;

export const getRiskScoreLevelScriptId = (riskScoreEntity: RiskScoreEntity, spaceId = 'default') =>
  `ml_${riskScoreEntity}riskscore_levels_script_${spaceId}`;
export const getRiskScoreInitScriptId = (riskScoreEntity: RiskScoreEntity, spaceId = 'default') =>
  `ml_${riskScoreEntity}riskscore_init_script_${spaceId}`;
export const getRiskScoreMapScriptId = (riskScoreEntity: RiskScoreEntity, spaceId = 'default') =>
  `ml_${riskScoreEntity}riskscore_map_script_${spaceId}`;
export const getRiskScoreReduceScriptId = (riskScoreEntity: RiskScoreEntity, spaceId = 'default') =>
  `ml_${riskScoreEntity}riskscore_reduce_script_${spaceId}`;

/**
 * These scripts and Ingest pipeline were not space awared before 8.5.
 * They were shared across spaces and therefore affected each other.
 * New scripts and ingest pipeline are all independent in each space, so these ids
 * are Deprecated.
 * But We still need to keep track of the old ids, so we can delete them during upgrade.
 */
export const getLegacyIngestPipelineName = (riskScoreEntity: RiskScoreEntity) =>
  `ml_${riskScoreEntity}riskscore_ingest_pipeline`;
export const getLegacyRiskScoreLevelScriptId = (riskScoreEntity: RiskScoreEntity) =>
  `ml_${riskScoreEntity}riskscore_levels_script`;
export const getLegacyRiskScoreInitScriptId = (riskScoreEntity: RiskScoreEntity) =>
  `ml_${riskScoreEntity}riskscore_init_script`;
export const getLegacyRiskScoreMapScriptId = (riskScoreEntity: RiskScoreEntity) =>
  `ml_${riskScoreEntity}riskscore_map_script`;
export const getLegacyRiskScoreReduceScriptId = (riskScoreEntity: RiskScoreEntity) =>
  `ml_${riskScoreEntity}riskscore_reduce_script`;

export const deleteRiskScoreIndicies = (riskScoreEntity: RiskScoreEntity, spaceId = 'default') => {
  cy.request({
    method: 'POST',
    url: `/internal/risk_score/indices/delete`,
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
    url: `/api/ingest_pipelines/${names.join(',')}`,
    headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
    failOnStatusCode: false,
  });
};

export const getTransformState = (transformId: string) => {
  return cy.request<{ transforms: Array<{ id: string; state: string }>; count: number }>({
    method: 'get',
    url: `/api/transform/transforms/${transformId}/_stats`,
    headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
  });
};

const stopTransform = (state: {
  transforms: Array<{ id: string; state: string }>;
  count: number;
}) => {
  return cy.request({
    method: 'post',
    url: `/api/transform/stop_transforms`,
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
    url: '/api/transform/delete_transforms',
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
    url: `/internal/risk_score/stored_scripts/delete`,
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
    url: `/internal/risk_score/prebuilt_content/saved_objects/_bulk_delete/${templateName}`,
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
    url: `/internal/risk_score/prebuilt_content/saved_objects/_bulk_create/${templateName}`,
    failOnStatusCode: false,
    headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
  });
};

export const HOST_RISK_SCORE = 'Host Risk Score';
export const USER_RISK_SCORE = 'User Risk Score';

export const RISK_SCORE_TAG_DESCRIPTION =
  'Security Solution Risk Score auto-generated tag' as const;

const getRiskScore = (riskScoreEntity: RiskScoreEntity) =>
  riskScoreEntity === RiskScoreEntity.user ? USER_RISK_SCORE : HOST_RISK_SCORE;
export const getRiskScoreTagName = (riskScoreEntity: RiskScoreEntity, spaceId = 'default') =>
  `${getRiskScore(riskScoreEntity)} ${spaceId}`;

export const findSavedObject = (riskScoreEntity: RiskScoreEntity, spaceId = 'default') => {
  const tagParams = {
    type: 'tag',
    search: getRiskScoreTagName(riskScoreEntity, spaceId),
    searchFields: ['name'],
    sortField: 'updated_at',
    sortOrder: 'desc',
  };
  const search = getRiskScoreTagName(riskScoreEntity, spaceId);
  const getSearchFields = encodeURI(`["name"]`);

  const getReference = (tagId: string) => encodeURIComponent(`[{"type":"tag","id":"${tagId}"}]`);

  return cy
    .request({
      method: 'get',
      url: `/api/saved_objects/_find?fields=id&type=tag&sort_field=updated_at&search=${search}&search_fields=name`,
      headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
    })
    .then((res) => {
      console.log('-------', search, res);

      return cy.request({
        method: 'get',
        url: `api/saved_objects/_find?fields=id&type=index-pattern&type=tag&type=visualization&type=dashboard&type=lens&sort_field=updated_at&has_reference=${getReference(
          res.body.saved_objects[0].id
        )}`,
        headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
      });
    });
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
