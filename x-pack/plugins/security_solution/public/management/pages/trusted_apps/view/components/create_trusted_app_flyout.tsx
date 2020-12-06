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
import React, { memo, useCallback, useEffect, useState } from 'react';
import { EuiFlyoutProps } from '@elastic/eui/src/components/flyout/flyout';
import { FormattedMessage } from '@kbn/i18n/react';
import { useDispatch } from 'react-redux';
import { i18n } from '@kbn/i18n';
import {
  CreateTrustedAppForm,
  CreateTrustedAppFormProps,
  TrustedAppFormState,
} from './create_trusted_app_form';
import { useTrustedAppsSelector } from '../hooks';
import { getApiCreateErrors, isCreatePending, wasCreateSuccessful } from '../../store/selectors';
import { AppAction } from '../../../../../common/store/actions';
import { useToasts } from '../../../../../common/lib/kibana';
import { ABOUT_TRUSTED_APPS } from '../translations';

type CreateTrustedAppFlyoutProps = Omit<EuiFlyoutProps, 'hideCloseButton'>;
export const CreateTrustedAppFlyout = memo<CreateTrustedAppFlyoutProps>(
  ({ onClose, ...flyoutProps }) => {
    const dispatch = useDispatch<(action: AppAction) => void>();
    const toasts = useToasts();

    const pendingCreate = useTrustedAppsSelector(isCreatePending);
    const apiErrors = useTrustedAppsSelector(getApiCreateErrors);
    const wasCreated = useTrustedAppsSelector(wasCreateSuccessful);

    const [formState, setFormState] = useState<undefined | TrustedAppFormState>();
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

    // If it was created, then close flyout
    useEffect(() => {
      if (wasCreated) {
        toasts.addSuccess(
          i18n.translate(
            'xpack.securitySolution.trustedapps.createTrustedAppFlyout.successToastTitle',
            {
              defaultMessage: '"{name}" has been added to the Trusted Applications list.',
              values: { name: formState?.item.name },
            }
          )
        );
        onClose();
      }
    }, [formState?.item?.name, onClose, toasts, wasCreated]);

    return (
      <EuiFlyout onClose={handleCancelClick} {...flyoutProps} hideCloseButton={pendingCreate}>
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
            isInvalid={!!apiErrors}
            error={apiErrors?.message}
            data-test-subj={getTestId('createForm')}
          />
        </EuiFlyoutBody>

        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={handleCancelClick}
                flush="left"
                isDisabled={pendingCreate}
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
                isDisabled={!formState?.isValid || pendingCreate}
                isLoading={pendingCreate}
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
