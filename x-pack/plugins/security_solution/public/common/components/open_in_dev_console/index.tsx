/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiButton, EuiFlexItem, EuiToolTip } from '@elastic/eui';

interface OpenInDevConsoleButtonProps {
  dataTestSubjPrefix?: string;
  loadFromUrl: string;
  signalIndexName: string;
  title: string;
}

const OpenInDevConsoleButtonComponent: React.FC<OpenInDevConsoleButtonProps> = ({
  dataTestSubjPrefix = 'open-in-dev-console',
  loadFromUrl,
  signalIndexName,
  title,
}) => {
  const href = `/app/dev_tools#/console?load_from=${loadFromUrl}`;
  return loadFromUrl ? (
    <EuiFlexItem>
      {signalIndexName != null ? (
        <EuiButton
          href={href}
          color="warning"
          target="_blank"
          isDisabled={false}
          data-test-subj={`${dataTestSubjPrefix}-enabled-module-button`}
        >
          {title}
        </EuiButton>
      ) : (
        <EuiToolTip
          position="top"
          // TODO: i18n
          content="Create a rule and generate some alerts to enable Host Risk Score Module"
        >
          <EuiButton
            href={href}
            color="warning"
            target="_blank"
            isDisabled={true}
            data-test-subj={`${dataTestSubjPrefix}-disabled-module-button`}
          >
            {title}
          </EuiButton>
        </EuiToolTip>
      )}
    </EuiFlexItem>
  ) : null;
};

export const OpenInDevConsoleButton = React.memo(OpenInDevConsoleButtonComponent);
OpenInDevConsoleButton.displayName = 'OpenInDevConsoleButton';
