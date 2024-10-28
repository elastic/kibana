/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonText,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  EuiStat,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { ERRORS_LABEL } from '../../../../monitor_details/monitor_summary/monitor_errors_count';
import { useErrorsHistogram } from '../../../hooks/use_errors_histogram';
import { OverviewErrorsSparklines } from './overview_errors_sparklines';

export function OverviewErrors() {
  const { histogram, totalErrors, loading } = useErrorsHistogram();

  return (
    <EuiPanel hasShadow={false} hasBorder>
      <EuiTitle size="xs">
        <h3>{headingText}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      {loading ? (
        <EuiSkeletonText lines={3} />
      ) : (
        <EuiFlexGroup gutterSize="xl">
          <EuiFlexItem grow={false}>
            <EuiStat
              description={ERRORS_LABEL}
              title={totalErrors}
              titleColor="danger"
              reverse
              titleSize="m"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={true}>
            <OverviewErrorsSparklines histogram={histogram} />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </EuiPanel>
  );
}

const headingText = i18n.translate('xpack.synthetics.overview.errors.headingText', {
  defaultMessage: 'Last 6 hours',
});
