/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const INGEST_PIPELINE_CREATION_ERROR_MESSAGE = i18n.translate(
  'xpack.securitySolution.riskyScore.api.ingestPipeline.create.errorMessageTitle',
  {
    defaultMessage: 'Failed to create Ingest pipeline',
  }
);

export const INGEST_PIPELINE_DELETION_ERROR_MESSAGE = (totalCount: number) =>
  i18n.translate('xpack.securitySolution.riskyScore.api.ingestPipeline.delete.errorMessageTitle', {
    values: { totalCount },
    defaultMessage: `Failed to delete ingest {totalCount, plural, =1 {pipeline} other {pipelines}}`,
  });

export const INDICES_CREATION_ERROR_MESSAGE = i18n.translate(
  'xpack.securitySolution.riskyScore.api.indices.create.errorMessageTitle',
  {
    defaultMessage: 'Failed to create index',
  }
);

export const INDICES_DELETION_ERROR_MESSAGE = (totalCount: number) =>
  i18n.translate('xpack.securitySolution.riskyScore.api.indices.delete.errorMessageTitle', {
    values: { totalCount },
    defaultMessage: `Failed to delete {totalCount, plural, =1 {index} other {indices}}`,
  });

export const STORED_SCRIPT_CREATION_ERROR_MESSAGE = i18n.translate(
  'xpack.securitySolution.riskyScore.api.storedScript.create.errorMessageTitle',
  {
    defaultMessage: 'Failed to create stored script',
  }
);

export const STORED_SCRIPT_DELETION_ERROR_MESSAGE = i18n.translate(
  'xpack.securitySolution.riskyScore.api.storedScript.delete.errorMessageTitle',
  {
    defaultMessage: `Failed to delete stored script`,
  }
);

export const TRANSFORM_CREATION_ERROR_MESSAGE = i18n.translate(
  'xpack.securitySolution.riskyScore.api.transforms.create.errorMessageTitle',
  {
    defaultMessage: 'Failed to create Transform',
  }
);

export const TRANSFORM_DELETION_ERROR_MESSAGE = (totalCount: number) =>
  i18n.translate('xpack.securitySolution.riskyScore.api.transforms.delete.errorMessageTitle', {
    values: { totalCount },
    defaultMessage: `Failed to delete {totalCount, plural, =1 {index} other {indices}}`,
  });

export const GET_TRANSFORM_STATE_ERROR_MESSAGE = i18n.translate(
  'xpack.securitySolution.riskyScore.api.transforms.getState.errorMessageTitle',
  {
    defaultMessage: `Failed to get Transform state`,
  }
);

export const START_TRANSFORMS_ERROR_MESSAGE = (totalCount: number) =>
  i18n.translate('xpack.securitySolution.riskyScore.api.transforms.start.errorMessageTitle', {
    values: { totalCount },
    defaultMessage: `Failed to start {totalCount, plural, =1 {Transform} other {Transforms}}`,
  });

export const STOP_TRANSFORMS_ERROR_MESSAGE = (totalCount: number) =>
  i18n.translate('xpack.securitySolution.riskyScore.api.transforms.stop.errorMessageTitle', {
    values: { totalCount },
    defaultMessage: `Failed to stop {totalCount, plural, =1 {Transform} other {Transforms}}`,
  });

export const INSTALLATION_ERROR = i18n.translate(
  'xpack.securitySolution.riskyScore.install.errorMessageTitle',
  {
    defaultMessage: 'Installation error',
  }
);

export const UNINSTALLATION_ERROR = i18n.translate(
  'xpack.securitySolution.riskyScore.uninstall.errorMessageTitle',
  {
    defaultMessage: 'Uninstallation error',
  }
);
