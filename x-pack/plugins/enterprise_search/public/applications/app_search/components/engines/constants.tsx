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

export const ENGINES_OVERVIEW_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.enginesOverview.title',
  { defaultMessage: 'Engines overview' }
);

export const META_ENGINES_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.metaEngines.title',
  { defaultMessage: 'Meta Engines' }
);

export const SOURCE_ENGINES_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.enginesOverview.metaEnginesTable.sourceEngines.title',
  { defaultMessage: 'Source Engines' }
);

export const CREATE_AN_ENGINE_BUTTON_LABEL = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engines.createEngineButtonLabel',
  {
    defaultMessage: 'Create engine',
  }
);
export const CREATE_A_META_ENGINE_BUTTON_LABEL = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engines.createMetaEngineButtonLabel',
  {
    defaultMessage: 'Create meta engine',
  }
);

export const DELETE_ENGINE_MESSAGE = (engineName: string) =>
  i18n.translate(
    'xpack.enterpriseSearch.appSearch.enginesOverview.table.action.delete.successMessage',
    {
      defaultMessage: "Engine '{engineName}' was deleted",
      values: {
        engineName,
      },
    }
  );
