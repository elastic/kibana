/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const LABEL = i18n.translate('xpack.securitySolution.markdown.insight.label', {
  defaultMessage: 'Label',
});

export const LABEL_TEXT = i18n.translate('xpack.securitySolution.markdown.insight.labelText', {
  defaultMessage: 'Label for the filter button rendered in the guide.',
});

export const DESCRIPTION = i18n.translate('xpack.securitySolution.markdown.insight.description', {
  defaultMessage: 'Description',
});

export const DESCRIPTION_TEXT = i18n.translate(
  'xpack.securitySolution.markdown.insight.descriptionText',
  {
    defaultMessage: 'Description of the relevance of the query.',
  }
);

export const FILTER_BUILDER = i18n.translate(
  'xpack.securitySolution.markdown.insight.filterBuilder',
  {
    defaultMessage: 'Filter Creation',
  }
);

export const FILTER_BUILDER_TEXT = i18n.translate(
  'xpack.securitySolution.markdown.insight.filterBuilderText',
  {
    defaultMessage:
      'Create filters to be used for displaying matching document counts and to populate the timeline query builder when clicked. Parameters that are wrapped in double braces {example} are assumed to be keys in the alert associated with the investigation guide, and values from the alert document will be substituted in place at query time.',
    values: {
      example: '{{kibana.alert.example}}',
    },
  }
);

export const RELATIVE_TIMERANGE = i18n.translate(
  'xpack.securitySolution.markdown.insight.relativeTimerange',
  {
    defaultMessage: 'Relative time range',
  }
);

export const RELATIVE_TIMERANGE_TEXT = i18n.translate(
  'xpack.securitySolution.markdown.insight.relativeTimerangeText',
  {
    defaultMessage: 'Select a time range relative to the time of the alert (optional).',
  }
);

export const CANCEL_FORM_BUTTON = i18n.translate(
  'xpack.securitySolution.markdown.insight.modalCancelButtonLabel',
  {
    defaultMessage: 'Cancel',
  }
);

export const TECH_PREVIEW = i18n.translate(
  'xpack.securitySolution.markdown.insight.technicalPreview',
  {
    defaultMessage: 'Technical Preview',
  }
);

export const PARSE_ERROR = i18n.translate(
  'xpack.securitySolution.markdownEditor.plugins.insightProviderError',
  {
    defaultMessage: 'Unable to parse insight provider configuration',
  }
);

export const INVALID_FILTER_ERROR = (err: string) =>
  i18n.translate('xpack.securitySolution.markdownEditor.plugins.insightConfigError', {
    values: { err },
    defaultMessage: 'Unable to parse insight JSON configuration: {err}',
  });
