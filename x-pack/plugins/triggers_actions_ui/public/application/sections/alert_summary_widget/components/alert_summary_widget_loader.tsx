/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingChart } from '@elastic/eui';
import { AlertSummaryWidgetProps } from '..';

type Props = Pick<AlertSummaryWidgetProps, 'fullSize'>;

export const AlertSummaryWidgetLoader = ({ fullSize }: Props) => {
  return (
    <div
      style={{
        minHeight: fullSize ? 238 : 224,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <EuiLoadingChart size="l" data-test-subj="alertSummaryWidgetLoading" />
    </div>
  );
};
