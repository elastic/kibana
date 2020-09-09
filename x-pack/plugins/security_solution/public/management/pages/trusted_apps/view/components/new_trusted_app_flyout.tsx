/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlyout, EuiFlyoutBody } from '@elastic/eui';
import React, { memo } from 'react';
import { EuiFlyoutProps } from '@elastic/eui/src/components/flyout/flyout';
import { NewTrustedAppForm } from './new_trusted_app_form';

// FIXME:PT remove the ability o disable the close action on the flyout from props (controlled internally)
export const NewTrustedAppFlyout = memo<EuiFlyoutProps>((props) => {
  return (
    <EuiFlyout {...props}>
      <EuiFlyoutBody>
        <NewTrustedAppForm />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
});
NewTrustedAppFlyout.displayName = 'NewTrustedAppFlyout';
