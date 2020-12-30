/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const INSERT_TIMELINE = i18n.translate(
  'xpack.securitySolution.markdownEditor.plugins.timeline.insertTimelineButtonLabel',
  {
    defaultMessage: 'Insert timeline link',
  }
);

export const TIMELINE_ID = (timelineId: string) =>
  i18n.translate('xpack.securitySolution.markdownEditor.plugins.timeline.toolTip.timelineId', {
    defaultMessage: 'Timeline id: { timelineId }',
    values: {
      timelineId,
    },
  });

export const NO_TIMELINE_NAME_FOUND = i18n.translate(
  'xpack.securitySolution.markdownEditor.plugins.timeline.noTimelineNameFoundErrorMsg',
  {
    defaultMessage: 'No timeline name found',
  }
);

export const NO_TIMELINE_ID_FOUND = i18n.translate(
  'xpack.securitySolution.markdownEditor.plugins.timeline.noTimelineIdFoundErrorMsg',
  {
    defaultMessage: 'No timeline id found',
  }
);

export const TIMELINE_URL_IS_NOT_VALID = (timelineUrl: string) =>
  i18n.translate(
    'xpack.securitySolution.markdownEditor.plugins.timeline.toolTip.timelineUrlIsNotValidErrorMsg',
    {
      defaultMessage: 'Timeline URL is not valid => {timelineUrl}',
      values: {
        timelineUrl,
      },
    }
  );

export const NO_PARENTHESES = i18n.translate(
  'xpack.securitySolution.markdownEditor.plugins.timeline.noParenthesesErrorMsg',
  {
    defaultMessage: 'Expected left parentheses',
  }
);
