/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const i18nTexts = {
  title: i18n.translate('xpack.ingestPipelines.form.savePipelineError', {
    defaultMessage: 'Unable to create pipeline',
  }),
  errors: {
    processor: (processorType: string) =>
      i18n.translate('xpack.ingestPipelines.form.savePipelineError.processorLabel', {
        defaultMessage: '{type} processor',
        values: { type: processorType },
      }),
    showErrors: (hiddenErrorsCount: number) =>
      i18n.translate('xpack.ingestPipelines.form.savePipelineError.showAllButton', {
        defaultMessage:
          'Show {hiddenErrorsCount, plural, one {# more error} other {# more errors}}',
        values: {
          hiddenErrorsCount,
        },
      }),
    hideErrors: (hiddenErrorsCount: number) =>
      i18n.translate('xpack.ingestPipelines.form.savePip10mbelineError.showFewerButton', {
        defaultMessage: 'Hide {hiddenErrorsCount, plural, one {# error} other {# errors}}',
        values: {
          hiddenErrorsCount,
        },
      }),
    unknownError: i18n.translate('xpack.ingestPipelines.form.unknownError', {
      defaultMessage: 'An unknown error occurred.',
    }),
  },
};
