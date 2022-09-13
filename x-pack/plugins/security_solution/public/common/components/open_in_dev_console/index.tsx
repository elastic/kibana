/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiButton, EuiFlexItem, EuiToolTip } from '@elastic/eui';

interface OpenInDevConsoleButtonProps {
  enableButton: boolean;
  href: string;
  tooltipContent?: string;
  title: string;
}

const OpenInDevConsoleButtonComponent: React.FC<OpenInDevConsoleButtonProps> = ({
  enableButton,
  href,
  tooltipContent,
  title,
}) => {
  return (
    <EuiFlexItem>
      {enableButton ? (
        <EuiButton
          href={href}
          color="warning"
          target="_self"
          isDisabled={false}
          data-test-subj="open-in-console-button"
        >
          {title}
        </EuiButton>
      ) : tooltipContent ? (
        <EuiToolTip content={tooltipContent}>
          <EuiButton
            href={href}
            color="warning"
            isDisabled={true}
            data-test-subj="disabled-open-in-console-button-with-tooltip"
          >
            {title}
          </EuiButton>
        </EuiToolTip>
      ) : (
        <EuiButton
          href={href}
          color="warning"
          isDisabled={true}
          data-test-subj="disabled-open-in-console-button"
        >
          {title}
        </EuiButton>
      )}
    </EuiFlexItem>
  );
};

export const OpenInDevConsoleButton = React.memo(OpenInDevConsoleButtonComponent);
OpenInDevConsoleButton.displayName = 'OpenInDevConsoleButton';
