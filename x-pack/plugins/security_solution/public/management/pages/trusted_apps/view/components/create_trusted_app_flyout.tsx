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
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React, { memo, useCallback, useEffect } from 'react';
import { EuiFlyoutProps } from '@elastic/eui/src/components/flyout/flyout';
import { FormattedMessage } from '@kbn/i18n/react';
import { useDispatch } from 'react-redux';
import { CreateTrustedAppForm, CreateTrustedAppFormProps } from './create_trusted_app_form';
import {
  getCreationError,
  isCreationDialogFormValid,
  isCreationInProgress,
  isCreationSuccessful,
} from '../../store/selectors';
import { AppAction } from '../../../../../common/store/actions';
import { useTrustedAppsSelector } from '../hooks';
import { ABOUT_TRUSTED_APPS } from '../translations';

type CreateTrustedAppFlyoutProps = Omit<EuiFlyoutProps, 'hideCloseButton'>;
export const CreateTrustedAppFlyout = memo<CreateTrustedAppFlyoutProps>(
  ({ onClose, ...flyoutProps }) => {
    const dispatch = useDispatch<(action: AppAction) => void>();

    const creationInProgress = useTrustedAppsSelector(isCreationInProgress);
    const creationErrors = useTrustedAppsSelector(getCreationError);
    const creationSuccessful = useTrustedAppsSelector(isCreationSuccessful);
    const isFormValid = useTrustedAppsSelector(isCreationDialogFormValid);

    const dataTestSubj = flyoutProps['data-test-subj'];

    const getTestId = useCallback(
      (suffix: string): string | undefined => {
        if (dataTestSubj) {
          return `${dataTestSubj}-${suffix}`;
        }
      },
      [dataTestSubj]
    );
    const handleCancelClick = useCallback(() => {
      if (creationInProgress) {
        return;
      }
      onClose();
    }, [onClose, creationInProgress]);
    const handleSaveClick = useCallback(
      () => dispatch({ type: 'trustedAppCreationDialogConfirmed' }),
      [dispatch]
    );
    const handleFormOnChange = useCallback<CreateTrustedAppFormProps['onChange']>(
      (newFormState) => {
        dispatch({
          type: 'trustedAppCreationDialogFormStateUpdated',
          payload: { entry: newFormState.item, isValid: newFormState.isValid },
        });
      },
      [dispatch]
    );

    // If it was created, then close flyout
    useEffect(() => {
      if (creationSuccessful) {
        onClose();
      }
    }, [onClose, creationSuccessful]);

    return (
      <EuiFlyout onClose={handleCancelClick} {...flyoutProps} hideCloseButton={creationInProgress}>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 data-test-subj={getTestId('headerTitle')}>
              <FormattedMessage
                id="xpack.securitySolution.trustedapps.createTrustedAppFlyout.title"
                defaultMessage="Add trusted application"
              />
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>

        <EuiFlyoutBody>
          <EuiText color="subdued" size="xs">
            <p data-test-subj={getTestId('about')}>{ABOUT_TRUSTED_APPS}</p>
            <EuiSpacer size="m" />
          </EuiText>
          <CreateTrustedAppForm
            fullWidth
            onChange={handleFormOnChange}
            isInvalid={!!creationErrors}
            error={creationErrors?.message}
            data-test-subj={getTestId('createForm')}
          />
        </EuiFlyoutBody>

        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={handleCancelClick}
                flush="left"
                isDisabled={creationInProgress}
                data-test-subj={getTestId('cancelButton')}
              >
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
                isDisabled={!isFormValid || creationInProgress}
                isLoading={creationInProgress}
                data-test-subj={getTestId('createButton')}
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
