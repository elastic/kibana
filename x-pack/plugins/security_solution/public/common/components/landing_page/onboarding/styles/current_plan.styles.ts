/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { useMemo } from 'react';

export const useCurrentPlanStyles = () => {
  const { euiTheme } = useEuiTheme();
  const styles = useMemo(() => {
    return {
      currentPlanWrapperStyles: css({
        backgroundColor: euiTheme.colors.lightestShade,
        borderRadius: '56px',
        padding: `${euiTheme.size.xs} ${euiTheme.size.s} ${euiTheme.size.xs} ${euiTheme.size.m}`,
        height: euiTheme.size.xl,
      }),
      currentPlanTextStyles: css({
        fontSize: euiTheme.size.m,
        fontWeight: euiTheme.font.weight.bold,
        paddingRight: euiTheme.size.xs,
      }),
      projectFeaturesUrlStyles: css({
        marginLeft: euiTheme.size.xs,
      }),
    };
  }, [
    euiTheme.colors.lightestShade,
    euiTheme.font.weight.bold,
    euiTheme.size.m,
    euiTheme.size.s,
    euiTheme.size.xl,
    euiTheme.size.xs,
  ]);

  return styles;
};
