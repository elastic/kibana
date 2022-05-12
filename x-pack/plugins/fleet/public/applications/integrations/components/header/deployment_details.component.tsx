/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';

import {
  EuiPopover,
  EuiText,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiCopy,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiLink,
  EuiHeaderLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface Props {
  cloudId: string;
  managementUrl?: string;
  learnMoreUrl: string;
}

const Description = styled(EuiText)`
  margin-bottom: ${({ theme }) => theme.eui.euiSizeL};
`;

export const DeploymentDetails = ({ cloudId, learnMoreUrl, managementUrl }: Props) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const button = (
    <EuiHeaderLink onClick={() => setIsOpen(!isOpen)} iconType="iInCircle" iconSide="left" isActive>
      {i18n.translate('xpack.fleet.integrations.deploymentButton', {
        defaultMessage: 'View deployment details',
      })}
    </EuiHeaderLink>
  );

  const management = managementUrl ? (
    <EuiFormRow label="API keys" fullWidth>
      <EuiFlexGroup gutterSize="m" alignItems="center">
        <EuiFlexItem>
          <EuiButton href={managementUrl}>Create and manage API keys</EuiButton>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiLink external href={learnMoreUrl} target="_blank">
            Learn more
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  ) : null;

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      button={button}
      anchorPosition="downCenter"
    >
      <div style={{ width: 450 }}>
        <Description>
          Send data to Elastic from your applications by referencing your deployment and
          Elasticsearch information.
        </Description>
        <EuiForm component="div">
          <EuiFormRow label="Cloud ID" fullWidth>
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem>
                <EuiFieldText value={cloudId} fullWidth disabled />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiCopy textToCopy={cloudId}>
                  {(copy) => (
                    <EuiButtonIcon
                      onClick={copy}
                      iconType="copyClipboard"
                      display="base"
                      size="m"
                    />
                  )}
                </EuiCopy>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFormRow>
          {management}
        </EuiForm>
      </div>
    </EuiPopover>
  );
};
