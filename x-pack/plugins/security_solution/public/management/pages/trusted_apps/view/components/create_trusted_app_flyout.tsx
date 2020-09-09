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
import {
  CreateTrustedAppForm,
  CreateTrustedAppFormProps,
  TrustedAppFormState,
} from './create_trusted_app_form';

type CreateTrustedAppFlyoutProps = Omit<EuiFlyoutProps, 'hideCloseButton'>;
export const CreateTrustedAppFlyout = memo<CreateTrustedAppFlyoutProps>(
  ({ onClose, ...flyoutProps }) => {
    const [formState, setFormState] = useState<undefined | TrustedAppFormState>();
    const handleCancelClick = useCallback(() => {
      onClose();
    }, [onClose]);
    const handleSaveClick = useCallback(() => {}, []);
    const handleFormOnChange = useCallback<CreateTrustedAppFormProps['onChange']>(
      (newFormState) => {
        setFormState(newFormState);
      },
      []
    );

    return (
      <EuiFlyout onClose={onClose} {...flyoutProps}>
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
              <EuiButtonEmpty onClick={handleCancelClick} flush="left">
                <FormattedMessage
                  id="xpack.securitySolution.trustedapps.createTrustedAppFlyout.cancelButton"
                  defaultMessage="Cancel"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton onClick={handleSaveClick} fill isDisabled={!formState?.isValid}>
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
