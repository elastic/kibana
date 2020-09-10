/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';
import React, { memo, useCallback, useState } from 'react';
import { EuiFlyoutProps } from '@elastic/eui/src/components/flyout/flyout';
import { FormattedMessage } from '@kbn/i18n/react';
import { useDispatch } from 'react-redux';
import {
  CreateTrustedAppForm,
  CreateTrustedAppFormProps,
  TrustedAppFormState,
} from './create_trusted_app_form';
import { useTrustedAppsSelector } from '../hooks';
import { isCreatePending } from '../../store/selectors';
import { AppAction } from '../../../../../common/store/actions';

type CreateTrustedAppFlyoutProps = Omit<EuiFlyoutProps, 'hideCloseButton'>;
export const CreateTrustedAppFlyout = memo<CreateTrustedAppFlyoutProps>(
  ({ onClose, ...flyoutProps }) => {
    const dispatch = useDispatch<(action: AppAction) => void>();
    const pendingCreate = useTrustedAppsSelector(isCreatePending);
    const [formState, setFormState] = useState<undefined | TrustedAppFormState>();
    const handleCancelClick = useCallback(() => {
      if (pendingCreate) {
        return;
      }
      onClose();
    }, [onClose, pendingCreate]);
    const handleSaveClick = useCallback(() => {
      if (formState) {
        dispatch({
          type: 'userClickedSaveNewTrustedAppButton',
          payload: {
            type: 'pending',
            data: formState.item,
          },
        });
      }
    }, [dispatch, formState]);
    const handleFormOnChange = useCallback<CreateTrustedAppFormProps['onChange']>(
      (newFormState) => {
        setFormState(newFormState);
      },
      []
    );

    return (
      <EuiFlyout onClose={handleCancelClick} {...flyoutProps} hideCloseButton={pendingCreate}>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>
              <FormattedMessage
                id="xpack.securitySolution.trustedapps.createTrustedAppFlyout.title"
                defaultMessage="Add trusted application"
              />
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>

        <EuiFlyoutBody>
          <CreateTrustedAppForm fullWidth onChange={handleFormOnChange} />
        </EuiFlyoutBody>

        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={handleCancelClick} flush="left" isDisabled={pendingCreate}>
                <FormattedMessage
                  id="xpack.securitySolution.trustedapps.createTrustedAppFlyout.cancelButton"
                  defaultMessage="Cancel"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                onClick={handleSaveClick}
                fill
                isDisabled={!formState?.isValid || pendingCreate}
                isLoading={pendingCreate}
              >
                <FormattedMessage
                  id="xpack.securitySolution.trustedapps.createTrustedAppFlyout.saveButton"
                  defaultMessage="Add trusted application"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
);
CreateTrustedAppFlyout.displayName = 'NewTrustedAppFlyout';
