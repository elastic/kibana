/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import styled, { css } from 'styled-components';

/**
 * UTILITY BAR
 */

export interface BarProps {
  border?: boolean;
}

export interface BarSectionProps {
  grow?: boolean;
}

export interface BarGroupProps {
  grow?: boolean;
}

export const Bar = styled.aside.attrs({
  className: 'siemUtilityBar',
})<BarProps>`
  ${({ border, theme }) => css`
    ${border &&
    css`
      border-bottom: ${theme.eui.euiBorderThin};
      padding-bottom: ${theme.eui.paddingSizes.s};
    `}

    @media only screen and (min-width: ${theme.eui.euiBreakpoints.l}) {
      display: flex;
      justify-content: space-between;
    }
  `}
`;
Bar.displayName = 'Bar';

export const BarSection = styled.div.attrs({
  className: 'siemUtilityBar__section',
})<BarSectionProps>`
  ${({ grow, theme }) => css`
    & + & {
      margin-top: ${theme.eui.euiSizeS};
    }

    @media only screen and (min-width: ${theme.eui.euiBreakpoints.m}) {
      display: flex;
      flex-wrap: wrap;
    }

    @media only screen and (min-width: ${theme.eui.euiBreakpoints.l}) {
      & + & {
        margin-top: 0;
        margin-left: ${theme.eui.euiSize};
      }
    }
    ${grow &&
    css`
      flex: 1;
    `}
  `}
`;
BarSection.displayName = 'BarSection';

export const BarGroup = styled.div.attrs({
  className: 'siemUtilityBar__group',
})<BarGroupProps>`
  ${({ grow, theme }) => css`
    align-items: flex-start;
    display: flex;
    flex-wrap: wrap;

    & + & {
      margin-top: ${theme.eui.euiSizeS};
    }

    @media only screen and (min-width: ${theme.eui.euiBreakpoints.m}) {
      border-right: ${theme.eui.euiBorderThin};
      flex-wrap: nowrap;
      margin-right: ${theme.eui.paddingSizes.m};
      padding-right: ${theme.eui.paddingSizes.m};

      & + & {
        margin-top: 0;
      }

      &:last-child {
        border-right: none;
        margin-right: 0;
        padding-right: 0;
      }
    }

    & > * {
      margin-right: ${theme.eui.euiSize};

      &:last-child {
        margin-right: 0;
      }
    }
    ${grow &&
    css`
      flex: 1;
    `}
  `}
`;
BarGroup.displayName = 'BarGroup';

export const BarText = styled.p.attrs({
  className: 'siemUtilityBar__text',
})<{ shouldWrap: boolean }>`
  ${({ shouldWrap, theme }) => css`
    color: ${theme.eui.euiTextSubduedColor};
    font-size: ${theme.eui.euiFontSizeXS};
    line-height: ${theme.eui.euiLineHeight};
    white-space: ${shouldWrap ? 'normal' : 'nowrap'};
  `}
`;
BarText.displayName = 'BarText';

export const BarAction = styled.div.attrs({
  className: 'siemUtilityBar__action',
})`
  ${({ theme }) => css`
    font-size: ${theme.eui.euiFontSizeXS};
    line-height: ${theme.eui.euiLineHeight};
  `}
`;
BarAction.displayName = 'BarAction';

export const BarSpacer = styled.div.attrs({
  className: 'siemUtilityBar__spacer',
})`
  ${() => css`
    flex: 1;
  `}
`;
BarSpacer.displayName = 'BarSpacer';
