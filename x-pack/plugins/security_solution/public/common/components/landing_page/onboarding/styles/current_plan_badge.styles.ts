/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { useMemo } from 'react';

export const useCurrentPlanBadgeStyles = () => {
  const { euiTheme } = useEuiTheme();
  const styles = useMemo(() => {
    return {
      wrapperStyles: css({
        fontSize: euiTheme.size.m,
        lineHeight: euiTheme.size.m,
      }),
      textStyles: css({
        textTransform: 'capitalize',
      }),
    };
  }, [euiTheme.size.m]);

  return styles;
};
