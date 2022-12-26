/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useEuiTheme, EuiRadioGroup, type EuiRadioGroupProps } from '@elastic/eui';
import { css } from '@emotion/react';

type RadioGroupProps = Pick<EuiRadioGroupProps, 'onChange' | 'options' | 'idSelected' | 'disabled'>;

type Props = RadioGroupProps & {
  size?: 's' | 'm';
};

export const RadioGroup = ({ idSelected, size, options, disabled, onChange }: Props) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiRadioGroup
      className="__extendedRadioGroup"
      disabled={disabled}
      idSelected={idSelected}
      options={options.map((o) => ({
        id: o.id,
        label: o.label,
        disabled: o.disabled,
        ['data-enabled']: idSelected === o.id,
        ['data-disabled']: o.disabled,
        className: '__extendedRadioOption',
      }))}
      onChange={onChange}
      css={css`
        display: grid;
        align-items: center;

        // Show columns for m+ screens (above 768px)
        @media only screen and (min-width: ${euiTheme.breakpoint.m}px) {
          grid-template-columns: repeat(${options.length}, 1fr);
          grid-template-rows: ${size === 's' ? euiTheme.size.xxl : euiTheme.size.xxxl};
          column-gap: ${euiTheme.size.s};
        }

        // Show rows for m- screens (below 768px)
        @media only screen and (max-width: ${euiTheme.breakpoint.m}px) {
          grid-template-rows: repeat(
            ${options.length},
            ${size === 's' ? euiTheme.size.xxl : euiTheme.size.xxxl}
          );
          grid-template-columns: 1fr;
          row-gap: ${euiTheme.size.s};
        }

        > .__extendedRadioOption {
          margin-top: 0;
          height: 100%;
          padding-left: ${size === 's' ? euiTheme.size.s : euiTheme.size.m};
          padding-right: ${size === 's' ? euiTheme.size.s : euiTheme.size.m};

          display: grid;
          grid-template-columns: auto 1fr;
          column-gap: ${euiTheme.size.s};
          align-items: center;

          border: 1px solid ${euiTheme.colors.lightShade};
          border-radius: ${euiTheme.border.radius.medium};
          background: ${euiTheme.colors.emptyShade};

          &[data-enabled='true'] {
            border-color: ${euiTheme.colors.primary};
            background: ${euiTheme.colors.lightestShade};
          }

          &[data-disabled='true'] {
            border-color: ${euiTheme.colors.disabled};
            background: ${euiTheme.colors.emptyShade};
          }

          // EuiRadio shows an absolute positioned div as a circle instead of input[type=radio] which is hidden
          // removing the absolute position to make it part of document flow, set by css grid
          &.__extendedRadioOption {
            & > *:not(label):not(input) {
              position: inherit;
              top: 0;
              left: 0;
            }

            & > label {
              padding-left: 0;
            }
          }
        }
      `}
    />
  );
};
