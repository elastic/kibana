/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SOURCE_ENGINES_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.souceEngines.title',
  { defaultMessage: 'Manage engines' }
);

export const ADD_SOURCE_ENGINES_BUTTON_LABEL = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.souceEngines.addSourceEnginesButtonLabel',
  { defaultMessage: 'Add engines' }
);

export const ADD_SOURCE_ENGINES_MODAL_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.souceEngines.addSourceEnginesModal.title',
  { defaultMessage: 'Add engines' }
);

export const ADD_SOURCE_ENGINES_MODAL_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.souceEngines.addSourceEnginesModal.description',
  { defaultMessage: 'Add additional engines to this meta engine.' }
);

export const ADD_SOURCE_ENGINES_PLACEHOLDER = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.souceEngines.addSourceEnginesPlaceholder',
  { defaultMessage: 'Select engine(s)' }
);

export const ADD_SOURCE_ENGINES_SUCCESS_MESSAGE = (sourceEngineNames: string[]) =>
  i18n.translate(
    'xpack.enterpriseSearch.appSearch.engine.souceEngines.addSourceEnginesSuccessMessage',
    {
      defaultMessage:
        '{sourceEnginesCount, plural, one {# engine was} other {# engines were}} added to this meta engine',
      values: { sourceEnginesCount: sourceEngineNames.length },
    }
  );

export const REMOVE_SOURCE_ENGINE_BUTTON_LABEL = i18n.translate(
  'xpack.enterpriseSearch.appSearch.sourceEngines.removeEngineButton.label',
  { defaultMessage: 'Remove from meta engine' }
);

export const REMOVE_SOURCE_ENGINE_CONFIRM_DIALOGUE = (engineName: string) =>
  i18n.translate(
    'xpack.enterpriseSearch.appSearch.sourceEngines.removeEngineConfirmDialogue.description',
    {
      defaultMessage:
        'This will remove the engine, {engineName}, from this meta engine. All existing settings will be lost. Are you sure?',
      values: { engineName },
    }
  );

export const REMOVE_SOURCE_ENGINE_SUCCESS_MESSAGE = (engineName: string) =>
  i18n.translate(
    'xpack.enterpriseSearch.appSearch.engine.souceEngines.removeSourceEngineSuccessMessage',
    {
      defaultMessage: "Engine ''{engineName}'' was removed from this meta engine",
      values: { engineName },
    }
  );
