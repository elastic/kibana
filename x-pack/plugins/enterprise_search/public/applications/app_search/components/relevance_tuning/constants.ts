/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { BoostType } from './types';

export const FIELD_FILTER_CUTOFF = 10;

export const RELEVANCE_TUNING_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.title',
  { defaultMessage: 'Relevance Tuning' }
);

export const UPDATE_SUCCESS_MESSAGE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.messages.updateSuccess',
  {
    defaultMessage: 'Relevance successfully tuned. The changes will impact your results shortly.',
  }
);
export const DELETE_SUCCESS_MESSAGE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.messages.deleteSuccess',
  {
    defaultMessage:
      'Relevance has been reset to default values. The change will impact your results shortly.',
  }
);
export const RESET_CONFIRMATION_MESSAGE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.messages.resetConfirmation',
  {
    defaultMessage: 'Are you sure you want to restore relevance defaults?',
  }
);
export const DELETE_CONFIRMATION_MESSAGE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.messages.deleteConfirmation',
  {
    defaultMessage: 'Are you sure you want to delete this boost?',
  }
);
export const PROXIMITY_DISPLAY = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.boosts.proximityDropDownOptionLabel',
  {
    defaultMessage: 'Proximity',
  }
);
export const FUNCTIONAL_DISPLAY = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.boosts.functionalDropDownOptionLabel',
  {
    defaultMessage: 'Functional',
  }
);
export const VALUE_DISPLAY = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.boosts.valueDropDownOptionLabel',
  {
    defaultMessage: 'Value',
  }
);
export const BOOST_TYPE_TO_DISPLAY_MAP = {
  [BoostType.Proximity]: PROXIMITY_DISPLAY,
  [BoostType.Functional]: FUNCTIONAL_DISPLAY,
  [BoostType.Value]: VALUE_DISPLAY,
};

export const BOOST_TYPE_TO_ICON_MAP = {
  [BoostType.Value]: 'tokenNumber',
  [BoostType.Functional]: 'tokenFunction',
  [BoostType.Proximity]: 'tokenGeo',
};
