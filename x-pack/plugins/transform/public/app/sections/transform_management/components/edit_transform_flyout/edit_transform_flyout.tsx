/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import { isPostTransformsUpdateResponseSchema } from '../../../../../../common/api_schemas/type_guards';
import { TransformConfigUnion } from '../../../../../../common/types/transform';

import { getErrorMessage } from '../../../../../../common/utils/errors';

import { refreshTransformList$, REFRESH_TRANSFORM_LIST_STATE } from '../../../../common';
import { useToastNotifications } from '../../../../app_dependencies';
import { useApi } from '../../../../hooks/use_api';

import { EditTransformFlyoutCallout } from './edit_transform_flyout_callout';
import { EditTransformFlyoutForm } from './edit_transform_flyout_form';
import {
  applyFormStateToTransformConfig,
  useEditTransformFlyout,
} from './use_edit_transform_flyout';
import { ManagedTransformsWarningCallout } from '../managed_transforms_callout/managed_transforms_callout';
import { isManagedTransform } from '../../../../common/managed_transforms_utils';

interface EditTransformFlyoutProps {
  closeFlyout: () => void;
  config: TransformConfigUnion;
  dataViewId?: string;
}

export const EditTransformFlyout: FC<EditTransformFlyoutProps> = ({
  closeFlyout,
  config,
  dataViewId,
}) => {
  const api = useApi();
  const toastNotifications = useToastNotifications();

  const [state, dispatch] = useEditTransformFlyout(config);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  async function submitFormHandler() {
    setErrorMessage(undefined);
    const requestConfig = applyFormStateToTransformConfig(config, state);
    const transformId = config.id;

    const resp = await api.updateTransform(transformId, requestConfig);

    if (!isPostTransformsUpdateResponseSchema(resp)) {
      setErrorMessage(getErrorMessage(resp));
      return;
    }

    toastNotifications.addSuccess(
      i18n.translate('xpack.transform.transformList.editTransformSuccessMessage', {
        defaultMessage: 'Transform {transformId} updated.',
        values: { transformId },
      })
    );
    closeFlyout();
    refreshTransformList$.next(REFRESH_TRANSFORM_LIST_STATE.REFRESH);
  }

  const isUpdateButtonDisabled = !state.isFormValid || !state.isFormTouched;

  return (
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
      {isManagedTransform({ config }) ? (
        <ManagedTransformsWarningCallout
          count={1}
          action={i18n.translate('xpack.transform.transformList.editManagedTransformsDescription', {
            defaultMessage: 'editing',
          })}
        />
      ) : null}
      <EuiFlyoutBody banner={<EditTransformFlyoutCallout />}>
        <EditTransformFlyoutForm editTransformFlyout={[state, dispatch]} dataViewId={dataViewId} />
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
  );
};
