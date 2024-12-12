/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { Status } from '@kbn/slo-schema';

export const useSloCardColors = (): Record<Status, string> => {
  const { euiTheme } = useEuiTheme();
  return {
    DEGRADING: euiTheme.colors.backgroundBaseWarning,
    VIOLATED: euiTheme.colors.backgroundBaseDanger,
    HEALTHY: euiTheme.colors.backgroundBaseSuccess,
    NO_DATA: euiTheme.colors.backgroundBaseSubdued,
  };
};
