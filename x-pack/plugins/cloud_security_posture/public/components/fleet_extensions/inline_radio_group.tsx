/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiRadio, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

interface Props<T extends string> {
  size?: 's' | 'm';
  idSelected: string;
  options: Array<{
    id: T;
    label: React.ReactNode;
    icon?: string;
    disabled?: boolean;
    tooltip?: string;
  }>;
  onChange: (id: T) => void;
}

export const InlineRadioGroup = <T extends string>({
  idSelected,
  size,
  options,
  onChange,
}: Props<T>) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={css`
        display: grid;
        grid-template-columns: repeat(${options.length}, 1fr);
        grid-template-rows: ${size === 's' ? 40 : 52}px;
        column-gap: ${euiTheme.size.s};

        .__extended_radio {
          display: grid;
          grid-template-columns: auto auto 1fr;
        }
        .__extended_radio svg,
        .__extended_radio img {
          justify-self: flex-end;
        }

        button:disabled svg,
        button:disabled img {
          filter: grayscale(1);
        }
      `}
    >
      {options.map((option) => {
        const button = (
          <EuiButton
            key={option.id}
            size="m"
            color={'text'}
            onClick={() => onChange(option.id)}
            disabled={option.disabled}
            iconType={option.icon}
            iconSide="right"
            contentProps={{ className: '__extended_radio' }}
            style={{
              height: '100%',
              width: '100%',
              textDecoration: 'none',
              border: '1px solid',
              borderColor: option.disabled
                ? euiTheme.colors.disabled
                : idSelected === option.id
                ? euiTheme.colors.primary
                : euiTheme.colors.lightShade,
              background:
                idSelected === option.id
                  ? euiTheme.colors.lightestShade
                  : euiTheme.colors.emptyShade,
            }}
          >
            <EuiRadio
              checked={idSelected === option.id}
              disabled={option.disabled}
              onChange={() => {}}
            />
            {option.label}
          </EuiButton>
        );

        if (option.tooltip)
          return (
            <EuiToolTip key={option.id} content={option.tooltip}>
              {button}
            </EuiToolTip>
          );

        return button;
      })}
    </div>
  );
};
