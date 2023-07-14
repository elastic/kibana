/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingChart, EuiLoadingSpinner } from '@elastic/eui';
import { AlertSummaryWidgetProps } from '..';

type Props = Pick<AlertSummaryWidgetProps, 'fullSize' | 'hideChart'>;

export const AlertSummaryWidgetLoader = ({ fullSize, hideChart }: Props) => {
  return (
    <div
      style={{
        minHeight: hideChart ? 44 : fullSize ? 238 : 224,
        display: 'flex',
        alignItems: 'center',
        justifyContent: hideChart ? 'flex-start' : 'center',
      }}
    >
      {hideChart ? (
        <EuiLoadingSpinner size="m" />
      ) : (
        <EuiLoadingChart size="l" data-test-subj="alertSummaryWidgetLoading" />
      )}
    </div>
  );
};
