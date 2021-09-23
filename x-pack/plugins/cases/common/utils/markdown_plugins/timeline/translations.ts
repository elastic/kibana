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

export const NO_TIMELINE_NAME_FOUND = i18n.translate(
  'xpack.cases.markdownEditor.plugins.timeline.noTimelineNameFoundErrorMsg',
  {
    defaultMessage: 'No timeline name found',
  }
);

export const NO_TIMELINE_URL_FOUND = i18n.translate(
  'xpack.cases.markdownEditor.plugins.timeline.noTimelineUrlFoundErrorMsg',
  {
    defaultMessage: 'No timeline URL found',
  }
);
