/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useEuiTheme, transparentize } from '@elastic/eui';
import { CSSObject } from '@emotion/react';

interface StylesDeps {
  display: string | undefined;
}

export const useStyles = ({ display }: StylesDeps) => {
  const { euiTheme } = useEuiTheme();

  const cached = useMemo(() => {
    const item: CSSObject = {
      display,
      alignItems: 'center',
      padding: `${euiTheme.size.xs} ${euiTheme.size.s} `,
      width: '100%',
      fontWeight: 'inherit',
      height: 'max-content',
      minHeight: euiTheme.size.l,
      letterSpacing: '0px',
      textAlign: 'left',
    };

    const copiableItem: CSSObject = {
      ...item,
      position: 'relative',
      borderRadius: euiTheme.border.radius.medium,
      '&:hover': {
        background: transparentize(euiTheme.colors.primary, 0.1),
      },
      height: 'fit-content',
    };

    return {
      item,
      copiableItem,
    };
  }, [display, euiTheme]);

  return cached;
};
