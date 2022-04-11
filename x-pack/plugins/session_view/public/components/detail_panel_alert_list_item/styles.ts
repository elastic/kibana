/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useEuiTheme, transparentize } from '@elastic/eui';
import { CSSObject, css } from '@emotion/react';

export const useStyles = (minimal = false, isInvestigated = false) => {
  const { euiTheme } = useEuiTheme();

  const cached = useMemo(() => {
    const { colors, font, size, border } = euiTheme;

    const dangerBorder = transparentize(colors.danger, 0.2);
    const dangerBackground = transparentize(colors.danger, 0.08);
    const borderThickness = border.width.thin;
    const mediumPadding = size.m;

    let alertTitleColor = colors.text;
    let borderColor = colors.lightShade;

    if (isInvestigated) {
      alertTitleColor = colors.primaryText;
      borderColor = dangerBorder;
    }

    const alertItem = css`
      border: ${borderThickness} solid ${borderColor};
      padding: ${mediumPadding};
      border-radius: ${border.radius.medium};

      margin: 0 ${mediumPadding} ${mediumPadding} ${mediumPadding};
      background-color: ${colors.emptyShade};

      & .euiAccordion__buttonContent {
        width: 100%;
      }

      & .euiAccordion__button {
        min-width: 0;
        width: calc(100% - ${size.l});
      }

      & .euiAccordion__childWrapper {
        overflow: visible;
      }
    `;

    const alertTitle: CSSObject = {
      display: minimal ? 'none' : 'initial',
      color: alertTitleColor,
      fontWeight: font.weight.semiBold,
      textOverflow: 'ellipsis',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
    };

    const alertIcon: CSSObject = {
      marginRight: size.s,
    };

    const alertAccordionButton: CSSObject = {
      width: `calc(100% - ${size.l})`,
      minWidth: 0,
    };

    const alertCountArrowPad: CSSObject = {
      marginRight: size.xs,
    };

    const processPanel: CSSObject = {
      border: `${borderThickness} solid ${colors.lightShade}`,
      fontFamily: font.familyCode,
      marginTop: minimal ? size.s : size.m,
      padding: `${size.xs} ${size.s}`,
    };

    const investigatedLabel: CSSObject = {
      position: 'relative',
      zIndex: 1,
      bottom: `-${mediumPadding}`,
      left: `-${mediumPadding}`,
      width: `calc(100% + ${mediumPadding} * 2)`,
      borderTop: `${borderThickness} solid ${dangerBorder}`,
      borderBottomLeftRadius: border.radius.medium,
      borderBottomRightRadius: border.radius.medium,
      backgroundColor: dangerBackground,
      textAlign: 'center',
    };

    const minimalContextMenu: CSSObject = {
      float: 'right',
    };

    const minimalHR: CSSObject = {
      marginBottom: 0,
    };

    return {
      alertItem,
      alertTitle,
      alertIcon,
      alertAccordionButton,
      alertCountArrowPad,
      processPanel,
      investigatedLabel,
      minimalContextMenu,
      minimalHR,
    };
  }, [euiTheme, isInvestigated, minimal]);

  return cached;
};
