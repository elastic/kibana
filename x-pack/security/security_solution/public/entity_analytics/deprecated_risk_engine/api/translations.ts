/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const INGEST_PIPELINE_CREATION_ERROR_MESSAGE = i18n.translate(
  'xpack.securitySolution.riskScore.api.ingestPipeline.create.errorMessageTitle',
  {
    defaultMessage: 'Failed to create Ingest pipeline',
  }
);

export const INGEST_PIPELINE_DELETION_ERROR_MESSAGE = (totalCount: number) =>
  i18n.translate('xpack.securitySolution.riskScore.api.ingestPipeline.delete.errorMessageTitle', {
    values: { totalCount },
    defaultMessage: `Failed to delete Ingest {totalCount, plural, =1 {pipeline} other {pipelines}}`,
  });

export const STORED_SCRIPT_CREATION_ERROR_MESSAGE = i18n.translate(
  'xpack.securitySolution.riskScore.api.storedScript.create.errorMessageTitle',
  {
    defaultMessage: 'Failed to create stored script',
  }
);

export const STORED_SCRIPT_DELETION_ERROR_MESSAGE = i18n.translate(
  'xpack.securitySolution.riskScore.api.storedScript.delete.errorMessageTitle',
  {
    defaultMessage: `Failed to delete stored script`,
  }
);

export const TRANSFORM_CREATION_ERROR_MESSAGE = i18n.translate(
  'xpack.securitySolution.riskScore.api.transforms.create.errorMessageTitle',
  {
    defaultMessage: 'Failed to create Transform',
  }
);

export const TRANSFORM_DELETION_ERROR_MESSAGE = (totalCount: number) =>
  i18n.translate('xpack.securitySolution.riskScore.api.transforms.delete.errorMessageTitle', {
    values: { totalCount },
    defaultMessage: `Failed to delete {totalCount, plural, =1 {Transform} other {Transforms}}`,
  });

export const GET_TRANSFORM_STATE_ERROR_MESSAGE = i18n.translate(
  'xpack.securitySolution.riskScore.api.transforms.getState.errorMessageTitle',
  {
    defaultMessage: `Failed to get Transform state`,
  }
);

export const GET_TRANSFORM_STATE_NOT_FOUND_MESSAGE = i18n.translate(
  'xpack.securitySolution.riskScore.api.transforms.getState.notFoundMessageTitle',
  {
    defaultMessage: `Transform not found`,
  }
);

export const START_TRANSFORMS_ERROR_MESSAGE = (totalCount: number) =>
  i18n.translate('xpack.securitySolution.riskScore.api.transforms.start.errorMessageTitle', {
    values: { totalCount },
    defaultMessage: `Failed to start {totalCount, plural, =1 {Transform} other {Transforms}}`,
  });

export const STOP_TRANSFORMS_ERROR_MESSAGE = (totalCount: number) =>
  i18n.translate('xpack.securitySolution.riskScore.api.transforms.stop.errorMessageTitle', {
    values: { totalCount },
    defaultMessage: `Failed to stop {totalCount, plural, =1 {Transform} other {Transforms}}`,
  });

export const INSTALLATION_ERROR = i18n.translate(
  'xpack.securitySolution.riskScore.install.errorMessageTitle',
  {
    defaultMessage: 'Installation error',
  }
);

export const UNINSTALLATION_ERROR = i18n.translate(
  'xpack.securitySolution.riskScore.uninstall.errorMessageTitle',
  {
    defaultMessage: 'Uninstallation error',
  }
);

export const IMPORT_SAVED_OBJECTS_SUCCESS = (totalCount: number) =>
  i18n.translate('xpack.securitySolution.riskScore.savedObjects.bulkCreateSuccessTitle', {
    values: { totalCount },
    defaultMessage: `{totalCount} {totalCount, plural, =1 {saved object} other {saved objects}} imported successfully`,
  });

export const IMPORT_SAVED_OBJECTS_FAILURE = i18n.translate(
  'xpack.securitySolution.riskScore.savedObjects.bulkCreateFailureTitle',
  {
    defaultMessage: `Failed to import saved objects`,
  }
);

export const DELETE_SAVED_OBJECTS_FAILURE = i18n.translate(
  'xpack.securitySolution.riskScore.savedObjects.bulkDeleteFailureTitle',
  {
    defaultMessage: `Failed to delete saved objects`,
  }
);

export const HOST_RISK_SCORES_ENABLED_TITLE = i18n.translate(
  'xpack.securitySolution.riskScore.hostRiskScoresEnabledTitle',
  {
    defaultMessage: `Host Risk Scores enabled`,
  }
);

export const USER_RISK_SCORES_ENABLED_TITLE = i18n.translate(
  'xpack.securitySolution.riskScore.userRiskScoresEnabledTitle',
  {
    defaultMessage: `User Risk Scores enabled`,
  }
);

export const RISK_SCORES_ENABLED_TEXT = (items: string) =>
  i18n.translate('xpack.securitySolution.riskScore.savedObjects.enableRiskScoreSuccessTitle', {
    values: { items },
    defaultMessage: `{items} imported successfully`,
  });
