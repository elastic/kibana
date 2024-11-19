/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { takeLeading } from 'redux-saga/effects';
import { i18n } from '@kbn/i18n';
import { fetchEffectFactory } from '../utils/fetch_effect';
import { addGlobalParam, deleteGlobalParams, editGlobalParam, getGlobalParams } from './api';
import {
  addNewGlobalParamAction,
  deleteGlobalParamsAction,
  editGlobalParamAction,
  getGlobalParamAction,
} from './actions';

export function* getGlobalParamEffect() {
  yield takeLeading(
    getGlobalParamAction.get,
    fetchEffectFactory(
      getGlobalParams,
      getGlobalParamAction.success,
      getGlobalParamAction.fail,
      undefined,
      getFailMessage
    )
  );
}

const getFailMessage = i18n.translate('xpack.synthetics.settings.getParams.failed', {
  defaultMessage: 'Failed to get global parameters.',
});

export function* addGlobalParamEffect() {
  yield takeLeading(
    addNewGlobalParamAction.get,
    fetchEffectFactory(
      addGlobalParam,
      addNewGlobalParamAction.success,
      addNewGlobalParamAction.fail,
      successMessage,
      failureMessage
    )
  );
}

const successMessage = i18n.translate('xpack.synthetics.settings.addParams.success', {
  defaultMessage: 'Successfully added global parameter.',
});

const failureMessage = i18n.translate('xpack.synthetics.settings.addParams.fail', {
  defaultMessage: 'Failed to add global parameter.',
});

export function* editGlobalParamEffect() {
  yield takeLeading(
    editGlobalParamAction.get,
    fetchEffectFactory(
      editGlobalParam,
      editGlobalParamAction.success,
      editGlobalParamAction.fail,
      editSuccessMessage,
      editFailureMessage
    )
  );
}

const editSuccessMessage = i18n.translate('xpack.synthetics.settings.editParams.success', {
  defaultMessage: 'Successfully edited global parameter.',
});

const editFailureMessage = i18n.translate('xpack.synthetics.settings.editParams.fail', {
  defaultMessage: 'Failed to edit global parameter.',
});

// deleteGlobalParams

export function* deleteGlobalParamsEffect() {
  yield takeLeading(
    deleteGlobalParamsAction.get,
    fetchEffectFactory(
      deleteGlobalParams,
      deleteGlobalParamsAction.success,
      deleteGlobalParamsAction.fail,
      deleteSuccessMessage,
      deleteFailureMessage
    )
  );
}

const deleteSuccessMessage = i18n.translate('xpack.synthetics.settings.deleteParams.success', {
  defaultMessage: 'Successfully deleted global parameters.',
});

const deleteFailureMessage = i18n.translate('xpack.synthetics.settings.deleteParams.fail', {
  defaultMessage: 'Failed to delete global parameters.',
});
