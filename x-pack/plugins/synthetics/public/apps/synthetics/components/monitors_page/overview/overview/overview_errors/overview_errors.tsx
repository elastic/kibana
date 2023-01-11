/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import React from 'react';
import { useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { OverviewErrorsSparklines } from './overview_errors_sparklines';
import { OverviewErrorsCount } from './overview_errors_count';
import { ErrorsLink } from '../../../../common/links/view_errors';
import { selectOverviewStatus } from '../../../../../state';

export function OverviewErrors() {
  const { status } = useSelector(selectOverviewStatus);

  return (
    <EuiPanel style={{ width: 500 }} hasShadow={false} hasBorder>
      <EuiTitle size="xs">
        <h3>{headingText}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="xl">
        <EuiFlexItem grow={false}>
          <OverviewErrorsCount from="now-6h/h" to="now" monitorId={status?.enabledIds ?? []} />
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <OverviewErrorsSparklines from="now-6h/h" to="now" monitorId={status?.enabledIds ?? []} />
        </EuiFlexItem>
        <EuiFlexItem grow={false} css={{ alignSelf: 'center' }}>
          <ErrorsLink disabled={true} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

const headingText = i18n.translate('xpack.synthetics.overview.errors.headingText', {
  defaultMessage: 'Last 6 hours',
});
