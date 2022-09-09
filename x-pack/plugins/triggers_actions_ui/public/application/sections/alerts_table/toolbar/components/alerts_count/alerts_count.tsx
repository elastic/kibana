/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const translateUnit = (totalCount: number) =>
  i18n.translate('xpack.triggersActionsUI.alertsTable.alertsCountUnit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {alert} other {alerts}}`,
  });

export const AlertsCount = ({ count }: { count: number }) => {
  const { euiTheme } = useEuiTheme();

  const alertCountText = useMemo(
    () => `${count.toLocaleString()} ${translateUnit(count)}`,
    [count]
  );

  return (
    <span
      data-test-subj="toolbar-alerts-count"
      style={{
        fontSize: euiTheme.size.m,
        fontWeight: euiTheme.font.weight.semiBold,
        borderRight: euiTheme.border.thin,
        marginRight: euiTheme.size.s,
        paddingRight: euiTheme.size.m,
      }}
    >
      {alertCountText}
    </span>
  );
};
