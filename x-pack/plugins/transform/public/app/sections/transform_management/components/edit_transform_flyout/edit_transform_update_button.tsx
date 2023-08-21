/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { EuiButton } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { isPostTransformsUpdateResponseSchema } from '../../../../../../common/api_schemas/type_guards';
import { getErrorMessage } from '../../../../../../common/utils/errors';

import { useRefreshTransformList } from '../../../../common';
import { useToastNotifications } from '../../../../app_dependencies';
import { useApi } from '../../../../hooks/use_api';

import { useEditTransformFlyout } from './use_edit_transform_flyout';

interface EditTransformUpdateButtonProps {
  closeFlyout: () => void;
}

export const EditTransformUpdateButton: FC<EditTransformUpdateButtonProps> = ({ closeFlyout }) => {
  const api = useApi();
  const refreshTransformList = useRefreshTransformList();
  const toastNotifications = useToastNotifications();

  const requestConfig = useEditTransformFlyout('requestConfig');
  const isUpdateButtonDisabled = useEditTransformFlyout('isUpdateButtonDisabled');
  const config = useEditTransformFlyout('config');
  const { apiError } = useEditTransformFlyout('actions');

  async function submitFormHandler() {
    apiError(undefined);
    const transformId = config.id;

    const resp = await api.updateTransform(transformId, requestConfig);

    if (!isPostTransformsUpdateResponseSchema(resp)) {
      apiError(getErrorMessage(resp));
      return;
    }

    toastNotifications.addSuccess(
      i18n.translate('xpack.transform.transformList.editTransformSuccessMessage', {
        defaultMessage: 'Transform {transformId} updated.',
        values: { transformId },
      })
    );
    closeFlyout();
    refreshTransformList();
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
