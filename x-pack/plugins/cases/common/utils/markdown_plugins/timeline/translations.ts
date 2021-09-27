/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const NO_CHARACTER = (character: string) =>
  i18n.translate('xpack.cases.markdownEditor.plugins.timeline.noCharacterErrorMsg', {
    defaultMessage: 'Expected a { character }',
    values: {
      character,
    },
  });

export const FAILED_PARSE_NAME = i18n.translate(
  'xpack.cases.markdownEditor.plugins.timeline.failedTimelineNameMsg',
  {
    defaultMessage: 'Failed to parse timeline title',
  }
);

export const FAILED_PARSE_URL = i18n.translate(
  'xpack.cases.markdownEditor.plugins.timeline.failedTimelineUrlMsg',
  {
    defaultMessage: 'Failed to parse timeline URL',
  }
);

export const FAILED_PARSE_QUERY_PARAMS = i18n.translate(
  'xpack.cases.markdownEditor.plugins.timeline.failedQueryParamsMsg',
  {
    defaultMessage: 'Failed to parse timeline query params',
  }
);

export const NO_ID_FIELD = i18n.translate(
  'xpack.cases.markdownEditor.plugins.timeline.noIdInQueryParamsMsg',
  {
    defaultMessage: 'Timeline query does not contain mandatory id field',
  }
);

export const FAILED_PARSE_URL_WITH_ERROR = (error: string) =>
  i18n.translate('xpack.cases.markdownEditor.plugins.timeline.noIdInQueryParamsMsg', {
    defaultMessage: 'Failed to parse timeline url: { error }',
    values: { error },
  });
