/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

interface StartChatPanelProps {
  title: string;
  description: string | React.ReactNode;
  isValid?: boolean;
}

export const StartChatPanel: React.FC<StartChatPanelProps> = ({
  title,
  description,
  children,
  isValid,
}) => (
  <EuiPanel hasBorder paddingSize="l">
    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
      <EuiTitle size="xs">
        <h5>{title}</h5>
      </EuiTitle>

      {isValid && (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiIcon type="check" color="success" />

            <EuiText size="xs" color="success">
              <p>
                <FormattedMessage
                  id="xpack.searchPlayground.startChatPanel.verified"
                  defaultMessage="Completed"
                />
              </p>
            </EuiText>
          </EuiFlexGroup>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>

    <EuiSpacer size="s" />

    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiText size="s">
        <p>{description}</p>
      </EuiText>

      {children}
    </EuiFlexGroup>
  </EuiPanel>
);
