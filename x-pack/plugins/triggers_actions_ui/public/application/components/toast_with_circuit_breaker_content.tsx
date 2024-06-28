/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useState, useCallback, FC, PropsWithChildren } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';

const seeFullErrorMessage = i18n.translate(
  'xpack.triggersActionsUI.components.toastWithCircuitBreaker.seeFullError',
  {
    defaultMessage: 'See full error',
  }
);

const hideFullErrorMessage = i18n.translate(
  'xpack.triggersActionsUI.components.toastWithCircuitBreaker.hideFullError',
  {
    defaultMessage: 'Hide full error',
  }
);

export const ToastWithCircuitBreakerContent: FC<PropsWithChildren<unknown>> = ({ children }) => {
  const [showDetails, setShowDetails] = useState(false);

  const onToggleShowDetails = useCallback(() => {
    setShowDetails((prev) => !prev);
  }, []);

  return (
    <>
      {showDetails && (
        <>
          <EuiText size="s">{children}</EuiText>
          <EuiSpacer />
        </>
      )}
      <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButton size="s" color="danger" onClick={onToggleShowDetails}>
            {showDetails ? hideFullErrorMessage : seeFullErrorMessage}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
