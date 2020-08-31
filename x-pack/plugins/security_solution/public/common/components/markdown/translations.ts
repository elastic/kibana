/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const MARKDOWN_HINT_HEADING = i18n.translate(
  'xpack.securitySolution.markdown.hint.headingLabel',
  {
    defaultMessage: '# heading',
  }
);

export const MARKDOWN_HINT_BOLD = i18n.translate('xpack.securitySolution.markdown.hint.boldLabel', {
  defaultMessage: '**bold**',
});

export const MARKDOWN_HINT_ITALICS = i18n.translate(
  'xpack.securitySolution.markdown.hint.italicsLabel',
  {
    defaultMessage: '_italics_',
  }
);

export const MARKDOWN_HINT_CODE = i18n.translate('xpack.securitySolution.markdown.hint.codeLabel', {
  defaultMessage: '`code`',
});

export const MARKDOWN_HINT_URL = i18n.translate('xpack.securitySolution.markdown.hint.urlLabel', {
  defaultMessage: '[link](url)',
});

export const MARKDOWN_HINT_BULLET = i18n.translate(
  'xpack.securitySolution.markdown.hint.bulletLabel',
  {
    defaultMessage: '* bullet',
  }
);

export const MARKDOWN_HINT_PREFORMATTED = i18n.translate(
  'xpack.securitySolution.markdown.hint.preformattedLabel',
  {
    defaultMessage: '```preformatted```',
  }
);

export const MARKDOWN_HINT_QUOTE = i18n.translate(
  'xpack.securitySolution.markdown.hint.quoteLabel',
  {
    defaultMessage: '>quote',
  }
);

export const MARKDOWN_HINT_STRIKETHROUGH = i18n.translate(
  'xpack.securitySolution.markdown.hint.strikethroughLabel',
  {
    defaultMessage: 'strikethrough',
  }
);

export const MARKDOWN_HINT_IMAGE_URL = i18n.translate(
  'xpack.securitySolution.markdown.hint.imageUrlLabel',
  {
    defaultMessage: '![image](url)',
  }
);

export const TIMELINE_ID = (timelineId: string) =>
  i18n.translate('xpack.securitySolution.markdown.toolTip.timelineId', {
    defaultMessage: 'Timeline id: { timelineId }',
    values: {
      timelineId,
    },
  });
