/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';

export const useGetStatusColor = (status: string | number) => {
  const { euiTheme } = useEuiTheme();
  const httpStatusCodeColors: Record<string, string> = {
    1: euiTheme.colors.vis.euiColorVisGrey0,
    2: euiTheme.colors.vis.euiColorVisSuccess0,
    3: euiTheme.colors.vis.euiColorVisGrey0,
    4: euiTheme.colors.vis.euiColorVisWarning1,
    5: euiTheme.colors.vis.euiColorVisDanger0,
  };
  const intStatus = typeof status === 'string' ? parseInt(status.replace(/\D/g, ''), 10) : status;
  return httpStatusCodeColors[intStatus.toString().substring(0, 1)];
};
