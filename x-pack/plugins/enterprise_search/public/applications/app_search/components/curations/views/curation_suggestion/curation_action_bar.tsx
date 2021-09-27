/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle } from '@elastic/eui';

import { CurationActionsPopover } from './curation_actions_popover';

interface Props {
  onAcceptClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  onRejectClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

export const CurationActionBar: React.FC<Props> = ({ onAcceptClick, onRejectClick }) => {
  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiPanel color="subdued" paddingSize="s">
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem>
              <EuiTitle size="xs">
                <h4>Manage suggestion</h4>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiFlexItem>
                  <EuiButton
                    size="s"
                    color="danger"
                    iconType="crossInACircleFilled"
                    onClick={onRejectClick}
                  >
                    Reject
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiButton
                    size="s"
                    color="success"
                    iconType="checkInCircleFilled"
                    onClick={onAcceptClick}
                  >
                    Accept
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem>
                  <CurationActionsPopover />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
