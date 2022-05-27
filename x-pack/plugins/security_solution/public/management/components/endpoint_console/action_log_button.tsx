/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
import { EuiButton, EuiFlyout } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const ActionLogButton = memo((props) => {
  const [showActionLogFlyout, setShowActionLogFlyout] = useState<boolean>(false);
  const toggleActionLog = useCallback(() => {
    setShowActionLogFlyout((prevState) => {
      return !prevState;
    });
  }, []);

  return (
    <>
      <EuiButton onClick={toggleActionLog} disabled={showActionLogFlyout} iconType="list">
        <FormattedMessage
          id="xpack.securitySolution.actionLogButton.label"
          defaultMessage="Action log"
        />
      </EuiButton>
      {showActionLogFlyout && (
        <EuiFlyout onClose={toggleActionLog}>{'TODO: flyout content will go here'}</EuiFlyout>
      )}
    </>
  );
});
ActionLogButton.displayName = 'ActionLogButton';
