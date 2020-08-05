/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { render, unmountComponentAtNode } from 'react-dom';
import { MountPoint } from 'kibana/public';
import { EuiText, EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';

export const insecureClusterAlertTitle = i18n.translate(
  'xpack.security.checkup.insecureClusterTitle',
  { defaultMessage: 'Please secure your installation' }
);

export const insecureClusterAlertText = (onDismiss: () => void) =>
  ((e) => {
    render(
      <div data-test-subj="insecureClusterAlertText">
        <EuiText>
          <FormattedMessage
            id="xpack.security.checkup.insecureClusterMessage"
            defaultMessage="Our free security features can protect against unauthorized access."
          />
        </EuiText>
        <EuiSpacer />
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButton
              color="primary"
              fill
              href="https://www.elastic.co/what-is/elastic-stack-security"
            >
              Learn more
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={onDismiss}>Dismiss</EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>,
      e
    );
    return () => unmountComponentAtNode(e);
  }) as MountPoint;
