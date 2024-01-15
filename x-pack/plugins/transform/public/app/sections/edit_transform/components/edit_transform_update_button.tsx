/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';
import { useDispatch } from 'react-redux';

import { EuiButton } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { useIsFormTouched } from '@kbn/ml-form-utils/use_is_form_touched';

import { useIsFormValid } from '@kbn/ml-form-utils/use_is_form_valid';
import { getErrorMessage } from '../../../../../common/utils/errors';

import { useUpdateTransform } from '../../../hooks';

import { useEditTransformFlyoutContext } from '../state_management/edit_transform_flyout_state';
import { useUpdatedTransformConfig } from '../state_management/selectors/updated_transform_config';
import { editTransformFlyoutSlice } from '../state_management/edit_transform_flyout_state';
import { getDefaultState } from '../state_management/get_default_state';
interface EditTransformUpdateButtonProps {
  closeFlyout: () => void;
}

export const EditTransformUpdateButton: FC<EditTransformUpdateButtonProps> = ({ closeFlyout }) => {
  const dispatch = useDispatch();
  const { config } = useEditTransformFlyoutContext();
  const isFormValid = useIsFormValid(editTransformFlyoutSlice.name);
  const isFormTouched = useIsFormTouched(editTransformFlyoutSlice.name, getDefaultState(config));
  const requestConfig = useUpdatedTransformConfig();
  const isUpdateButtonDisabled = !isFormValid || !isFormTouched;

  const updateTransfrom = useUpdateTransform(config.id, requestConfig);

  async function submitFormHandler() {
    dispatch(editTransformFlyoutSlice.actions.setSubmitErrorMessage(undefined));

    updateTransfrom(undefined, {
      onError: (error) =>
        dispatch(editTransformFlyoutSlice.actions.setSubmitErrorMessage(getErrorMessage(error))),
      onSuccess: () => closeFlyout(),
    });
  }

  return (
    <EuiButton
      data-test-subj="transformEditFlyoutUpdateButton"
      onClick={submitFormHandler}
      fill
      isDisabled={isUpdateButtonDisabled}
    >
      {i18n.translate('xpack.transform.transformList.editFlyoutUpdateButtonText', {
        defaultMessage: 'Update',
      })}
    </EuiButton>
  );
};
