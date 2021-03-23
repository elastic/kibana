/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const INSERT_LENS = i18n.translate(
  'xpack.securitySolution.markdownEditor.plugins.lens.insertLensButtonLabel',
  {
    defaultMessage: 'Insert lens link',
  }
);

export const LENS_ID = (lensId: string) =>
  i18n.translate('xpack.securitySolution.markdownEditor.plugins.lens.toolTip.lensId', {
    defaultMessage: 'Lens id: { lensId }',
    values: {
      lensId,
    },
  });

export const NO_LENS_NAME_FOUND = i18n.translate(
  'xpack.securitySolution.markdownEditor.plugins.lens.noLensNameFoundErrorMsg',
  {
    defaultMessage: 'No lens name found',
  }
);

export const NO_LENS_ID_FOUND = i18n.translate(
  'xpack.securitySolution.markdownEditor.plugins.lens.noLensIdFoundErrorMsg',
  {
    defaultMessage: 'No lens id found',
  }
);

export const LENS_URL_IS_NOT_VALID = (lensUrl: string) =>
  i18n.translate(
    'xpack.securitySolution.markdownEditor.plugins.lens.toolTip.lensUrlIsNotValidErrorMsg',
    {
      defaultMessage: 'Lens URL is not valid => {lensUrl}',
      values: {
        lensUrl,
      },
    }
  );

export const NO_PARENTHESES = i18n.translate(
  'xpack.securitySolution.markdownEditor.plugins.lens.noParenthesesErrorMsg',
  {
    defaultMessage: 'Expected left parentheses',
  }
);
