/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, FC } from 'react';

import { i18n } from '@kbn/i18n';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiOverlayMask,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import { getErrorMessage } from '../../../../../shared_imports';

import {
  refreshTransformList$,
  TransformPivotConfig,
  REFRESH_TRANSFORM_LIST_STATE,
} from '../../../../common';
import { useToastNotifications } from '../../../../app_dependencies';

import { useApi } from '../../../../hooks/use_api';

import { EditTransformFlyoutCallout } from './edit_transform_flyout_callout';
import { EditTransformFlyoutForm } from './edit_transform_flyout_form';
import {
  applyFormFieldsToTransformConfig,
  useEditTransformFlyout,
} from './use_edit_transform_flyout';

interface EditTransformFlyoutProps {
  closeFlyout: () => void;
  config: TransformPivotConfig;
}

export const EditTransformFlyout: FC<EditTransformFlyoutProps> = ({ closeFlyout, config }) => {
  const api = useApi();
  const toastNotifications = useToastNotifications();

  const [state, dispatch] = useEditTransformFlyout(config);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  async function submitFormHandler() {
    setErrorMessage(undefined);
    const requestConfig = applyFormFieldsToTransformConfig(config, state.formFields);
    const transformId = config.id;

    try {
      await api.updateTransform(transformId, requestConfig);
      toastNotifications.addSuccess(
        i18n.translate('xpack.transform.transformList.editTransformSuccessMessage', {
          defaultMessage: 'Transform {transformId} updated.',
          values: { transformId },
        })
      );
      closeFlyout();
      refreshTransformList$.next(REFRESH_TRANSFORM_LIST_STATE.REFRESH);
    } catch (e) {
      setErrorMessage(getErrorMessage(e));
    }
  }

  const isUpdateButtonDisabled = !state.isFormValid || !state.isFormTouched;

  return (
    <EuiOverlayMask>
      <EuiFlyout
        onClose={closeFlyout}
        hideCloseButton
        aria-labelledby="transformEditFlyoutTitle"
        data-test-subj="transformEditFlyout"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id="transformEditFlyoutTitle">
              {i18n.translate('xpack.transform.transformList.editFlyoutTitle', {
                defaultMessage: 'Edit {transformId}',
                values: {
                  transformId: config.id,
                },
              })}
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody banner={<EditTransformFlyoutCallout />}>
          <EditTransformFlyoutForm editTransformFlyout={[state, dispatch]} />
          {errorMessage !== undefined && (
            <>
              <EuiSpacer size="m" />
              <EuiCallOut
                title={i18n.translate(
                  'xpack.transform.transformList.editTransformGenericErrorMessage',
                  {
                    defaultMessage:
                      'An error occurred calling the API endpoint to update transforms.',
                  }
                )}
                color="danger"
                iconType="alert"
              >
                <p>{errorMessage}</p>
              </EuiCallOut>
            </>
          )}
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty iconType="cross" onClick={closeFlyout} flush="left">
                {i18n.translate('xpack.transform.transformList.editFlyoutCancelButtonText', {
                  defaultMessage: 'Cancel',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
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
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </EuiOverlayMask>
  );
};
