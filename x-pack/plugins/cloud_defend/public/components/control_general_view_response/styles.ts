/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { CSSObject } from '@emotion/react';
import { useEuiTheme, useEuiBackgroundColor } from '@elastic/eui';

export const useStyles = () => {
  const { euiTheme } = useEuiTheme();
  const { border, size } = euiTheme;
  const accordionColor = useEuiBackgroundColor('subdued');

  return useMemo(() => {
    const options: CSSObject = {
      position: 'absolute',
      top: size.m,
      right: size.m,
    };

    const accordion: CSSObject = {
      borderRadius: border.radius.medium,
      '> .euiAccordion__triggerWrapper': {
        padding: size.m,
      },
      backgroundColor: accordionColor,
    };

    const accordionHeader: CSSObject = {
      '> *': {
        display: 'inline-block',
        verticalAlign: 'middle',
      },
      '> b': {
        marginRight: size.s,
      },
    };

    return { options, accordion, accordionHeader };
  }, [accordionColor, border.radius.medium, size.m, size.s]);
};
