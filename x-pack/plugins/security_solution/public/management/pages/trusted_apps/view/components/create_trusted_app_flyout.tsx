/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
import React, { memo, useCallback, useEffect, useMemo } from 'react';
import { EuiFlyoutProps } from '@elastic/eui/src/components/flyout/flyout';
import { FormattedMessage } from '@kbn/i18n/react';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { CreateTrustedAppForm, CreateTrustedAppFormProps } from './create_trusted_app_form';
import {
  editTrustedAppFetchError,
  getCreationDialogFormEntry,
  getCreationError,
  getCurrentLocation,
  isCreationDialogFormValid,
  isCreationInProgress,
  isCreationSuccessful,
  isEdit,
  listOfPolicies,
  loadingPolicies,
} from '../../store/selectors';
import { AppAction } from '../../../../../common/store/actions';
import { useTrustedAppsSelector } from '../hooks';

import { ABOUT_TRUSTED_APPS, CREATE_TRUSTED_APP_ERROR } from '../translations';
import { defaultNewTrustedApp } from '../../store/builders';
import { getTrustedAppsListPath } from '../../../../common/routing';
import { useToasts } from '../../../../../common/lib/kibana';
import { useTestIdGenerator } from '../../../../components/hooks/use_test_id_generator';

type CreateTrustedAppFlyoutProps = Omit<EuiFlyoutProps, 'hideCloseButton'>;
export const CreateTrustedAppFlyout = memo<CreateTrustedAppFlyoutProps>(
  ({ onClose, ...flyoutProps }) => {
    const dispatch = useDispatch<(action: AppAction) => void>();
    const history = useHistory();
    const toasts = useToasts();

    const creationInProgress = useTrustedAppsSelector(isCreationInProgress);
    const creationErrors = useTrustedAppsSelector(getCreationError);
    const creationSuccessful = useTrustedAppsSelector(isCreationSuccessful);
    const isFormValid = useTrustedAppsSelector(isCreationDialogFormValid);
    const isLoadingPolicies = useTrustedAppsSelector(loadingPolicies);
    const policyList = useTrustedAppsSelector(listOfPolicies);
    const isEditMode = useTrustedAppsSelector(isEdit);
    const trustedAppFetchError = useTrustedAppsSelector(editTrustedAppFetchError);
    const formValues = useTrustedAppsSelector(getCreationDialogFormEntry) || defaultNewTrustedApp();
    const location = useTrustedAppsSelector(getCurrentLocation);

    const dataTestSubj = flyoutProps['data-test-subj'];

    const creationErrorsMessage = useMemo<string | undefined>(
      () =>
        creationErrors
          ? CREATE_TRUSTED_APP_ERROR[creationErrors.message.replace(/(\[(.*)\]\: )/, '')] ||
            creationErrors.message
          : undefined,
      [creationErrors]
    );
    const policies = useMemo<CreateTrustedAppFormProps['policies']>(() => {
      return {
        // Casting is needed due to the use of `Immutable<>` on the return value from the selector above
        options: policyList as CreateTrustedAppFormProps['policies']['options'],
        isLoading: isLoadingPolicies,
      };
    }, [isLoadingPolicies, policyList]);

    const getTestId = useTestIdGenerator(dataTestSubj);

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

    // If there was a failure trying to retrieve the Trusted App for edit item,
    // then redirect back to the list ++ show toast message.
    useEffect(() => {
      if (trustedAppFetchError) {
        // Replace the current URL route so that user does not keep hitting this page via browser back/fwd buttons
        history.replace(
          getTrustedAppsListPath({
            ...location,
            show: undefined,
            id: undefined,
          })
        );

        toasts.addWarning(
          i18n.translate(
            'xpack.securitySolution.trustedapps.createTrustedAppFlyout.notFoundToastMessage',
            {
              defaultMessage: 'Unable to edit trusted application ({apiMsg})',
              values: {
                apiMsg: trustedAppFetchError.message,
              },
            }
          )
        );
      }
    }, [history, location, toasts, trustedAppFetchError]);

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
              {isEditMode ? (
                <FormattedMessage
                  id="xpack.securitySolution.trustedapps.createTrustedAppFlyout.editTitle"
                  defaultMessage="Edit trusted application"
                />
              ) : (
                <FormattedMessage
                  id="xpack.securitySolution.trustedapps.createTrustedAppFlyout.createTitle"
                  defaultMessage="Add trusted application"
                />
              )}
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>

        <EuiFlyoutBody>
          {!isEditMode && (
            <EuiText color="subdued" size="xs">
              <p data-test-subj={getTestId('about')}>{ABOUT_TRUSTED_APPS}</p>
              <EuiSpacer size="m" />
            </EuiText>
          )}
          <CreateTrustedAppForm
            fullWidth
            onChange={handleFormOnChange}
            isInvalid={!!creationErrors}
            error={creationErrorsMessage}
            policies={policies}
            trustedApp={formValues}
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
                {isEditMode ? (
                  <FormattedMessage
                    id="xpack.securitySolution.trustedapps.createTrustedAppFlyout.editSaveButton"
                    defaultMessage="Save"
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.securitySolution.trustedapps.createTrustedAppFlyout.createSaveButton"
                    defaultMessage="Add trusted application"
                  />
                )}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
);

CreateTrustedAppFlyout.displayName = 'NewTrustedAppFlyout';
