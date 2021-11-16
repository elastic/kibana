/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useTheme } from '../../../hooks/use_theme';

export const useTransactionColors = () => {
  const euiTheme = useTheme();
  return {
    ALL_TRANSACTIONS: euiTheme.eui.euiColorVis1,
    ALL_FAILED_TRANSACTIONS: euiTheme.eui.euiColorVis7,
    FOCUS_TRANSACTION: euiTheme.eui.euiColorVis2,
  };
};
