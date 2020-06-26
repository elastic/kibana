/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, IconType } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

const EmptyPrompt = styled(EuiEmptyPrompt)`
  align-self: center; /* Corrects horizontal centering in IE11 */
`;

EmptyPrompt.displayName = 'EmptyPrompt';

interface EmptyPageProps {
  actionPrimaryIcon?: IconType;
  actionPrimaryLabel: string;
  actionPrimaryTarget?: string;
  actionPrimaryUrl: string;
  actionSecondaryIcon?: IconType;
  actionSecondaryLabel?: string;
  actionSecondaryTarget?: string;
  actionSecondaryUrl?: string;
  actionTertiaryIcon?: IconType;
  actionTertiaryLabel?: string;
  actionTertiaryTarget?: string;
  actionTertiaryUrl?: string;
  'data-test-subj'?: string;
  message?: string;
  title: string;
}

export const EmptyPage = React.memo<EmptyPageProps>(
  ({
    actionPrimaryIcon,
    actionPrimaryLabel,
    actionPrimaryTarget,
    actionPrimaryUrl,
    actionSecondaryIcon,
    actionSecondaryLabel,
    actionSecondaryTarget,
    actionSecondaryUrl,
    actionTertiaryIcon,
    actionTertiaryLabel,
    actionTertiaryTarget,
    actionTertiaryUrl,
    message,
    title,
    ...rest
  }) => (
    <EmptyPrompt
      iconType="securityAnalyticsApp"
      title={<h2>{title}</h2>}
      body={message && <p>{message}</p>}
      actions={
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              href={actionPrimaryUrl}
              iconType={actionPrimaryIcon}
              target={actionPrimaryTarget}
            >
              {actionPrimaryLabel}
            </EuiButton>
          </EuiFlexItem>

          {actionSecondaryLabel && actionSecondaryUrl && (
            <EuiFlexItem grow={false}>
              <EuiButton
                href={actionSecondaryUrl}
                iconType={actionSecondaryIcon}
                target={actionSecondaryTarget}
              >
                {actionSecondaryLabel}
              </EuiButton>
            </EuiFlexItem>
          )}

          {actionTertiaryLabel && actionTertiaryUrl && (
            <EuiFlexItem grow={false}>
              <EuiButton
                href={actionTertiaryUrl}
                iconType={actionTertiaryIcon}
                target={actionTertiaryTarget}
              >
                {actionTertiaryLabel}
              </EuiButton>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      }
      {...rest}
    />
  )
);

EmptyPage.displayName = 'EmptyPage';
