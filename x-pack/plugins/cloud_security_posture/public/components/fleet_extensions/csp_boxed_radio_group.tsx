/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useEuiTheme, EuiButton, EuiRadio } from '@elastic/eui';
import { css } from '@emotion/react';

interface Props {
  disabled?: boolean;
  options: RadioOption[];
  onChange(id: string): void;
  idSelected: string;
  size?: 's' | 'm';
}

interface RadioOption {
  disabled?: boolean;
  id: string;
  label: string;
  icon?: string;
  tooltip?: string;
}

export const RadioGroup = ({ idSelected, size, options, disabled, onChange }: Props) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={css`
        display: flex;
        flex-flow: row wrap;
        gap: ${euiTheme.size.s};

        // Show rows for m- screens (below 768px)
        @media only screen and (max-width: ${euiTheme.breakpoint.m}px) {
          button {
            min-width: 100%;
          }
        }
      `}
    >
      {options.map((option) => {
        const isChecked = option.id === idSelected;
        return (
          <EuiButton
            disabled={option.disabled || disabled}
            style={{
              flex: 1,
              border: `1px solid ${
                isChecked ? euiTheme.colors.primary : euiTheme.colors.lightShade
              }`,
            }}
            // Use empty string to fallback to no color
            // @ts-ignore
            color={isChecked ? 'primary' : ''}
            onClick={() => onChange(option.id)}
            iconType={option.icon}
            iconSide="right"
            contentProps={{
              style: {
                justifyContent: 'flex-start',
              },
            }}
            css={css`
              height: ${size === 's' ? euiTheme.size.xxl : euiTheme.size.xxxl};
              svg,
              img {
                margin-left: auto;
              }

              &&,
              &&:hover {
                text-decoration: none;
              }
            `}
          >
            <EuiRadio label={option.label} id={option.id} checked={isChecked} onChange={() => {}} />
          </EuiButton>
        );
      })}
    </div>
  );
};
