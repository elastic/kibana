/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, IconType } from '@elastic/eui';
import React, { MouseEventHandler, ReactNode } from 'react';
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
  actionPrimaryFill?: boolean;
  actionSecondaryIcon?: IconType;
  actionSecondaryLabel?: string;
  actionSecondaryTarget?: string;
  actionSecondaryUrl?: string;
  actionSecondaryOnClick?: MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>;
  'data-test-subj'?: string;
  message?: ReactNode;
  title: string;
}

export const EmptyPage = React.memo<EmptyPageProps>(
  ({
    actionPrimaryIcon,
    actionPrimaryLabel,
    actionPrimaryTarget,
    actionPrimaryUrl,
    actionPrimaryFill = true,
    actionSecondaryIcon,
    actionSecondaryLabel,
    actionSecondaryTarget,
    actionSecondaryUrl,
    actionSecondaryOnClick,
    message,
    title,
    ...rest
  }) => (
    <EmptyPrompt
      iconType="logoSecurity"
      title={<h2>{title}</h2>}
      body={message && <p>{message}</p>}
      actions={
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiButton
              fill={actionPrimaryFill}
              href={actionPrimaryUrl}
              iconType={actionPrimaryIcon}
              target={actionPrimaryTarget}
            >
              {actionPrimaryLabel}
            </EuiButton>
          </EuiFlexItem>

          {actionSecondaryLabel && actionSecondaryUrl && (
            <EuiFlexItem grow={false}>
              {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
              <EuiButton
                href={actionSecondaryUrl}
                onClick={actionSecondaryOnClick}
                iconType={actionSecondaryIcon}
                target={actionSecondaryTarget}
                data-test-subj="empty-page-secondary-action"
              >
                {actionSecondaryLabel}
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
