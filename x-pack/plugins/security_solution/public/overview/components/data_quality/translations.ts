/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const COLLAPSE_BUTTON_LABEL = (collapsed: boolean) =>
  collapsed
    ? i18n.translate('xpack.securitySolution.dataQuality.collapseButtonLabelOpen', {
        defaultMessage: 'Open',
      })
    : i18n.translate('xpack.securitySolution.dataQuality.collapseButtonLabelClosed', {
        defaultMessage: 'Closed',
      });

export const DATA_QUALITY_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.dataQuality.dataQualityDescription',
  {
    defaultMessage:
      'Check the quality of your data by comparing it with the Elastic Common Schema (ECS)',
  }
);

export const DATA_QUALITY_SUBTITLE = i18n.translate(
  'xpack.securitySolution.dataQuality.dataQualitySubtitle',
  {
    defaultMessage: 'Select an index to compare its mappings and data with the',
  }
);

export const DATA_QUALITY_TITLE = i18n.translate(
  'xpack.securitySolution.dataQuality.dataQualityTitle',
  {
    defaultMessage: 'Data quality',
  }
);

export const DEFAULT_PANEL_TITLE = i18n.translate(
  'xpack.securitySolution.dataQuality.defaultPanelTitle',
  {
    defaultMessage: 'Check index mappings',
  }
);

export const ECS_FIELDS = i18n.translate('xpack.securitySolution.dataQuality.ecsFieldsStat', {
  defaultMessage: 'ECS fields',
});

export const ECS_VERSION = i18n.translate('xpack.securitySolution.dataQuality.ecsVersionStat', {
  defaultMessage: 'ECS version',
});

export const ERROR_LOADING_ECS_METADATA = (details: string) =>
  i18n.translate('xpack.securitySolution.dataQuality.errorLoadingEcsMetadataLabel', {
    values: { details },
    defaultMessage: 'Error loading ECS metadata: {details}',
  });

export const ERROR_LOADING_ECS_METADATA_TITLE = i18n.translate(
  'xpack.securitySolution.dataQuality.emptyErrorPrompt.errorLoadingEcsMetadataTitle',
  {
    defaultMessage: 'Unable to load ECS metadata',
  }
);

export const ERROR_LOADING_ECS_VERSION = (details: string) =>
  i18n.translate('xpack.securitySolution.dataQuality.errorLoadingEcsVersionLabel', {
    values: { details },
    defaultMessage: 'Error loading ECS version: {details}',
  });

export const ERROR_LOADING_ECS_VERSION_TITLE = i18n.translate(
  'xpack.securitySolution.dataQuality.emptyErrorPrompt.errorLoadingEcsVersionTitle',
  {
    defaultMessage: 'Unable to load ECS version',
  }
);

export const ERROR_LOADING_MAPPINGS = (details: string) =>
  i18n.translate('xpack.securitySolution.dataQuality.errorLoadingMappingsLabel', {
    values: { details },
    defaultMessage: 'Error loading mappings: {details}',
  });

export const ERROR_LOADING_STATS = (details: string) =>
  i18n.translate('xpack.securitySolution.dataQuality.errorLoadingStatsLabel', {
    values: { details },
    defaultMessage: 'Error loading stats: {details}',
  });

export const ERROR_LOADING_UNALLOWED_VALUES = (details: string) =>
  i18n.translate('xpack.securitySolution.dataQuality.errorLoadingUnallowedValuesLabel', {
    values: { details },
    defaultMessage: 'Error loading unallowed values: {details}',
  });

export const FIELDS = i18n.translate('xpack.securitySolution.dataQuality.fieldsLabel', {
  defaultMessage: 'Fields',
});

export const INDEXES = i18n.translate('xpack.securitySolution.dataQuality.indexesLabel', {
  defaultMessage: 'Indexes',
});

export const INDEX_NAME = i18n.translate('xpack.securitySolution.dataQuality.indexNameLabel', {
  defaultMessage: 'Index name',
});

export const INDEXES_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.dataQuality.indexesPlaceholder',
  {
    defaultMessage: 'Select one or more indexes',
  }
);

export const LOADING_ECS_METADATA = i18n.translate(
  'xpack.securitySolution.dataQuality.emptyLoadingPrompt.loadingEcsMetadataPrompt',
  {
    defaultMessage: 'Loading ECS metadata',
  }
);

export const SELECT_AN_INDEX = i18n.translate(
  'xpack.securitySolution.dataQuality.selectAnIndexPrompt',
  {
    defaultMessage: 'Select an index to compare it against ECS version',
  }
);

export const TECHNICAL_PREVIEW = i18n.translate(
  'xpack.securitySolution.dataQuality.technicalPreviewBadge',
  {
    defaultMessage: 'Technical preview',
  }
);
