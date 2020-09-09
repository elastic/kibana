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
import React, { memo, useCallback } from 'react';
import { EuiFlyoutProps } from '@elastic/eui/src/components/flyout/flyout';
import { FormattedMessage } from '@kbn/i18n/react';
import { NewTrustedAppForm } from './new_trusted_app_form';

// FIXME:PT remove the ability o disable the close action on the flyout from props (controlled internally)
export const NewTrustedAppFlyout = memo<EuiFlyoutProps>(({ onClose, ...flyoutProps }) => {
  const handleCancelClick = useCallback(() => {
    onClose();
  }, [onClose]);
  const handleSaveClick = useCallback(() => {}, []);

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
        <NewTrustedAppForm />
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={handleCancelClick} flush="left">
              <FormattedMessage
                id="xpack.securitySolution.trustedapps.createTrustedAppFlyout.cancelButton"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={handleSaveClick} fill>
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
});
NewTrustedAppFlyout.displayName = 'NewTrustedAppFlyout';
