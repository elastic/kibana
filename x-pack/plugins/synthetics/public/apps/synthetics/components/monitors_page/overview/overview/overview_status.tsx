/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiStat, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useSelector } from 'react-redux';
import { selectOverviewStatus } from '../../../../state';

function title(t?: number) {
  return t ?? '-';
}

export function OverviewStatus() {
  const status = useSelector(selectOverviewStatus);

  return (
    <EuiPanel>
      <EuiTitle size="xs">
        <h3>{headingText}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="xl">
        <EuiFlexItem grow={false}>
          <EuiStat
            data-test-subj="xpack.uptime.synthetics.overview.status.up"
            description={upDescription}
            reverse
            title={title(status?.snapshot.up)}
            titleColor="success"
            titleSize="m"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiStat
            data-test-subj="xpack.uptime.synthetics.overview.status.down"
            description={downDescription}
            reverse
            title={title(status?.snapshot.down)}
            titleColor="danger"
            titleSize="m"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiStat
            data-test-subj="xpack.uptime.synthetics.overview.status.disabled"
            description={disabledDescription}
            reverse
            title={title(status?.disabledCount)}
            titleColor="subdued"
            titleSize="m"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

const headingText = i18n.translate('xpack.synthetics.overview.status.headingText', {
  defaultMessage: 'Current status',
});

const upDescription = i18n.translate('xpack.synthetics.overview.status.up.description', {
  defaultMessage: 'Up',
});

const downDescription = i18n.translate('xpack.synthetics.overview.status.down.description', {
  defaultMessage: 'Down',
});

const disabledDescription = i18n.translate(
  'xpack.synthetics.overview.status.disabled.description',
  {
    defaultMessage: 'Disabled',
  }
);
