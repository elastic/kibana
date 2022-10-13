/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import {
  BoostOperation,
  BoostType,
  FunctionalBoost,
  FunctionalBoostFunction,
  ProximityBoost,
  ProximityBoostFunction,
  ValueBoost,
} from './types';

export const FIELD_FILTER_CUTOFF = 10;

export const RELEVANCE_TUNING_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.title',
  { defaultMessage: 'Relevance Tuning' }
);

export const UPDATE_SUCCESS_MESSAGE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.messages.updateSuccess',
  {
    defaultMessage: 'Relevance was tuned',
  }
);
export const DELETE_SUCCESS_MESSAGE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.messages.deleteSuccess',
  {
    defaultMessage: 'Relevance was reset to default values',
  }
);
export const SUCCESS_CHANGES_MESSAGE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.messages.successDescription',
  {
    defaultMessage: 'The changes will impact your results shortly.',
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

const EMPTY_VALUE_BOOST: ValueBoost = {
  type: BoostType.Value,
  factor: 1,
  value: [''],
  newBoost: true,
  function: undefined,
  operation: undefined,
};

const EMPTY_FUNCTIONAL_BOOST: FunctionalBoost = {
  value: undefined,
  type: BoostType.Functional,
  factor: 1,
  newBoost: true,
  function: FunctionalBoostFunction.Logarithmic,
  operation: BoostOperation.Multiply,
};

const EMPTY_PROXIMITY_BOOST: ProximityBoost = {
  value: undefined,
  type: BoostType.Proximity,
  factor: 1,
  newBoost: true,
  operation: undefined,
  function: ProximityBoostFunction.Gaussian,
};

export const BOOST_TYPE_TO_EMPTY_BOOST = {
  [BoostType.Value]: EMPTY_VALUE_BOOST,
  [BoostType.Functional]: EMPTY_FUNCTIONAL_BOOST,
  [BoostType.Proximity]: EMPTY_PROXIMITY_BOOST,
};

export const ADD_DISPLAY = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.boosts.addOperationDropDownOptionLabel',
  {
    defaultMessage: 'Add',
  }
);

export const MULTIPLY_DISPLAY = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.boosts.multiplyOperationDropDownOptionLabel',
  {
    defaultMessage: 'Multiply',
  }
);

export const BOOST_OPERATION_DISPLAY_MAP = {
  [BoostOperation.Add]: ADD_DISPLAY,
  [BoostOperation.Multiply]: MULTIPLY_DISPLAY,
};

export const LOGARITHMIC_DISPLAY = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.boosts.logarithmicBoostFunctionDropDownOptionLabel',
  {
    defaultMessage: 'Logarithmic',
  }
);

export const GAUSSIAN_DISPLAY = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.boosts.gaussianFunctionDropDownOptionLabel',
  {
    defaultMessage: 'Gaussian',
  }
);

export const EXPONENTIAL_DISPLAY = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.boosts.exponentialFunctionDropDownOptionLabel',
  {
    defaultMessage: 'Exponential',
  }
);

export const LINEAR_DISPLAY = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.boosts.linearFunctionDropDownOptionLabel',
  {
    defaultMessage: 'Linear',
  }
);

export const PROXIMITY_BOOST_FUNCTION_DISPLAY_MAP = {
  [ProximityBoostFunction.Gaussian]: GAUSSIAN_DISPLAY,
  [ProximityBoostFunction.Exponential]: EXPONENTIAL_DISPLAY,
  [ProximityBoostFunction.Linear]: LINEAR_DISPLAY,
};

export const FUNCTIONAL_BOOST_FUNCTION_DISPLAY_MAP = {
  [FunctionalBoostFunction.Logarithmic]: LOGARITHMIC_DISPLAY,
  [FunctionalBoostFunction.Exponential]: EXPONENTIAL_DISPLAY,
  [FunctionalBoostFunction.Linear]: LINEAR_DISPLAY,
};
