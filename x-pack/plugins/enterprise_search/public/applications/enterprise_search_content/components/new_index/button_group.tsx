/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import classNames from 'classnames';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiText,
  EuiSplitPanel,
  EuiButtonIcon,
  EuiSpacer,
} from '@elastic/eui';

import './button_group.scss';

export interface ButtonGroupOption {
  badge?: React.ReactNode;
  description: string;
  footer: string;
  icon: string;
  id: string;
  label: string;
}

interface Props {
  onChange(option: ButtonGroupOption): void;
  options: ButtonGroupOption[];
  selected?: ButtonGroupOption;
}

export const ButtonGroup: React.FC<Props> = ({ onChange, options, selected }) => (
  <EuiFlexGroup className="buttonGroup" direction="column" gutterSize="m" role="radiogroup">
    {options.map((option, index) => {
      const isSelected = option === selected;
      return (
        <EuiFlexItem
          className={classNames('buttonGroupOption', {
            'buttonGroupOption--selected': isSelected,
          })}
          grow={false}
          onClick={() => {
            onChange(option);
          }}
        >
          <EuiSplitPanel.Outer
            borderRadius="m"
            grow
            hasBorder
            hasShadow={false}
            className="buttonGroupOption-panel"
          >
            <EuiSplitPanel.Inner color="plain" paddingSize="s">
              <EuiFlexGroup alignItems="center" responsive={false}>
                <EuiFlexItem>
                  {option.badge && (
                    <>
                      <div>{option.badge}</div>
                      <EuiSpacer size="xs" />
                    </>
                  )}
                  <EuiTitle size="xs">
                    <h4>{option.label}</h4>
                  </EuiTitle>
                  <EuiSpacer size="s" />
                  <EuiText size="s" color="subdued">
                    <p>{option.description}</p>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    display="base"
                    iconType={isSelected ? 'check' : 'arrowRight'}
                    color={isSelected ? 'success' : 'primary'}
                    aria-label={option.label}
                    aria-checked={isSelected}
                    role="radio"
                    autoFocus={index === 0}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiSplitPanel.Inner>
            <EuiSplitPanel.Inner color={isSelected ? 'success' : 'subdued'} paddingSize="s">
              <EuiText size="s" color={isSelected ? 'success' : 'subdued'}>
                <p>
                  <strong>{option.footer}</strong>
                </p>
              </EuiText>
            </EuiSplitPanel.Inner>
          </EuiSplitPanel.Outer>
        </EuiFlexItem>
      );
    })}
  </EuiFlexGroup>
);
