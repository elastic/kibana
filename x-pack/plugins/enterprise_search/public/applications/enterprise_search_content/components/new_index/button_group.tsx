/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle, EuiText, EuiIcon } from '@elastic/eui';

export interface ButtonGroupOption {
  id: string;
  icon: string;
  label: string;
  description: string;
}

interface Props {
  options: ButtonGroupOption[];
  selected?: ButtonGroupOption;
  onChange(option: ButtonGroupOption): void;
}

export const ButtonGroup: React.FC<Props> = ({ options, selected, onChange }) => (
  <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
    {options.map((option) => (
      <EuiFlexItem style={{ width: 'calc(100% - .5rem)' }}>
        <EuiPanel
          className={
            selected === option
              ? 'entSearchNewIndexButtonGroupButton--selected'
              : 'entSearchNewIndexButtonGroupButton'
          }
          hasShadow={false}
          onClick={() => {
            onChange(option);
          }}
        >
          <EuiFlexGroup alignItems="center" responsive={false}>
            <EuiFlexItem grow>
              <EuiFlexGroup direction="column" gutterSize="none">
                <EuiFlexItem grow={false}>
                  <EuiTitle size="xs">
                    <h4>{option.label}</h4>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow>
                  <EuiText size="xs">
                    <p>{option.description}</p>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <div className="rightArrow">
                <EuiIcon type="arrowRight" color="primary" />
              </div>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
);
