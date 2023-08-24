/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { EuiButton } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { getErrorMessage } from '../../../../../../common/utils/errors';

import { useUpdateTransform } from '../../../../hooks';

import { useEditTransformFlyout } from './use_edit_transform_flyout';

interface EditTransformUpdateButtonProps {
  closeFlyout: () => void;
}

export const EditTransformUpdateButton: FC<EditTransformUpdateButtonProps> = ({ closeFlyout }) => {
  const requestConfig = useEditTransformFlyout('requestConfig');
  const isUpdateButtonDisabled = useEditTransformFlyout('isUpdateButtonDisabled');
  const config = useEditTransformFlyout('config');
  const { apiError } = useEditTransformFlyout('actions');

  const updateTransfrom = useUpdateTransform(config.id, requestConfig);

  async function submitFormHandler() {
    apiError(undefined);

    updateTransfrom(undefined, {
      onError: (error) => apiError(getErrorMessage(error)),
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
