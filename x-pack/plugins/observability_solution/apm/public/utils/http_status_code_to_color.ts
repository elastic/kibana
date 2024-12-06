/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui'

export const useGetStatusColor = (status: string | number) => {
  const { euiTheme } = useEuiTheme();
  const httpStatusCodeColors: Record<string, string> = {
    1: euiTheme.colors.textSubdued,
    2: euiTheme.colors.textSuccess,
    3: euiTheme.colors.textSubdued,
    4: euiTheme.colors.textWarning,
    5: euiTheme.colors.textDanger,
  };
  const intStatus = typeof status === 'string' ? parseInt(status.replace(/\D/g, ''), 10) : status;
  return httpStatusCodeColors[intStatus.toString().substring(0, 1)];
};
