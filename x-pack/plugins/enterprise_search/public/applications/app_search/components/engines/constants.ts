/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ENGINES_TITLE = i18n.translate('xpack.enterpriseSearch.appSearch.engines.title', {
  defaultMessage: 'Engines',
});

export const META_ENGINES_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.metaEngines.title',
  { defaultMessage: 'Meta Engines' }
);

export const CREATE_AN_ENGINE_BUTTON_LABEL = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engines.createAnEngineButton.ButtonLabel',
  {
    defaultMessage: 'Create an engine',
  }
);

export const DELETE_ENGINE_MESSAGE = (engineName: string) =>
  i18n.translate(
    'xpack.enterpriseSearch.appSearch.enginesOverview.table.action.delete.successMessage',
    {
      defaultMessage: 'Successfully deleted "{engineName}"',
      values: {
        engineName,
      },
    }
  );

export const CREATE_A_META_ENGINE_BUTTON_LABEL = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engines.createAMetaEngineButton.ButtonLabel',
  {
    defaultMessage: 'Create a meta engine',
  }
);

export const META_ENGINE_EMPTY_PROMPT_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engines.metaEngines.emptyPrompTitle',
  {
    defaultMessage: 'No meta engines yet',
  }
);

export const META_ENGINE_EMPTY_PROMPT_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engines.metaEngines.emptyPromptDescription',
  {
    defaultMessage:
      'Meta engines allow you to combine multiple engines into one searchable engine.',
  }
);
