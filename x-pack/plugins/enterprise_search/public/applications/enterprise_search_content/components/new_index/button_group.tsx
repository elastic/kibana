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
  id: string;
  icon: string;
  label: string;
  description: string;
  footer: string;
  badge?: React.ReactNode;
}

interface Props {
  options: ButtonGroupOption[];
  selected?: ButtonGroupOption;
  onChange(option: ButtonGroupOption): void;
}

export const ButtonGroup: React.FC<Props> = ({ options, selected, onChange }) => (
  <EuiFlexGroup direction="column" gutterSize="m" className="buttonGroup">
    {options.map((option) => (
      <EuiFlexItem
        grow={false}
        onClick={() => {
          onChange(option);
        }}
      >
        <EuiSplitPanel.Outer
          grow
          hasBorder
          borderRadius="m"
          hasShadow={false}
          className={classNames('buttonGroupOption', {
            'buttonGroupOption-selected': option === selected,
          })}
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
                <EuiSpacer size="xs" />
                <EuiText size="xs" color="subdued">
                  <p>{option.description}</p>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon display="base" iconType="arrowRight" aria-label={option.label} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiSplitPanel.Inner>
          <EuiSplitPanel.Inner
            color={selected === option ? 'primary' : 'subdued'}
            paddingSize="s"
            className="buttonGroupOption--footer"
          >
            <EuiText size="xs" color={option === selected ? undefined : 'subdued'}>
              <p>
                <strong>{option.footer}</strong>
              </p>
            </EuiText>
          </EuiSplitPanel.Inner>
        </EuiSplitPanel.Outer>
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
);
