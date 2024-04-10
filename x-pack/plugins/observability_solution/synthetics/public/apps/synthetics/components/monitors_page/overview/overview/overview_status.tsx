/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiStat, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { clearOverviewStatusErrorAction } from '../../../../state/overview_status';
import { kibanaService } from '../../../../../../utils/kibana_service';
import { useGetUrlParams } from '../../../../hooks/use_url_params';
import { useOverviewStatus } from '../../hooks/use_overview_status';

function title(t?: number) {
  return t ?? '-';
}

export function OverviewStatus() {
  const { statusFilter } = useGetUrlParams();

  const { status, error: statusError } = useOverviewStatus({ scopeStatusByLocation: true });
  const dispatch = useDispatch();
  const [statusConfig, setStatusConfig] = useState({
    up: status?.up,
    down: status?.down,
    pending: status?.pending,
    disabledCount: status?.disabledCount,
  });

  useEffect(() => {
    if (statusError) {
      dispatch(clearOverviewStatusErrorAction());
      kibanaService.toasts.addError(statusError.body as Error, {
        title: errorToastTitle,
        toastLifeTimeMs: 5000,
      });
    }
  }, [dispatch, statusError]);

  useEffect(() => {
    if (statusFilter) {
      switch (statusFilter) {
        case 'up':
          setStatusConfig({
            up: status?.up || 0,
            down: 0,
            disabledCount: 0,
            pending: 0,
          });
          break;
        case 'down':
          setStatusConfig({
            up: 0,
            down: status?.down || 0,
            disabledCount: 0,
            pending: 0,
          });
          break;
        case 'disabled':
          setStatusConfig({
            up: 0,
            down: 0,
            disabledCount: status?.disabledCount || 0,
            pending: 0,
          });
          break;
        case 'pending':
          setStatusConfig({
            up: 0,
            down: 0,
            disabledCount: 0,
            pending: status?.pending || 0,
          });
          break;
      }
    } else if (status) {
      setStatusConfig({
        up: status.up,
        down: status.down,
        disabledCount: status.disabledCount,
        pending: status?.pending,
      });
    }
  }, [status, statusFilter]);

  return (
    <EuiPanel hasShadow={false} hasBorder>
      <EuiTitle size="xs">
        <h3>{headingText}</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="xl">
        <EuiFlexItem grow={false}>
          <EuiStat
            data-test-subj="xpack.uptime.synthetics.overview.status.up"
            description={upDescription}
            reverse
            title={title(statusConfig?.up)}
            titleColor="success"
            titleSize="m"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiStat
            data-test-subj="xpack.uptime.synthetics.overview.status.down"
            description={downDescription}
            reverse
            title={title(statusConfig?.down)}
            titleColor="danger"
            titleSize="m"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiStat
            data-test-subj="xpack.uptime.synthetics.overview.status.disabled"
            description={disabledDescription}
            reverse
            title={title(statusConfig?.disabledCount)}
            titleColor="subdued"
            titleSize="m"
          />
        </EuiFlexItem>
        {(statusConfig?.pending || 0) > 0 && (
          <EuiFlexItem grow={false}>
            <EuiStat
              data-test-subj="xpack.uptime.synthetics.overview.status.pending"
              description={pendingDescription}
              reverse
              title={title(statusConfig?.pending)}
              titleColor="subdued"
              titleSize="m"
            />
          </EuiFlexItem>
        )}
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

const pendingDescription = i18n.translate('xpack.synthetics.overview.status.pending.description', {
  defaultMessage: 'Pending',
});

const disabledDescription = i18n.translate(
  'xpack.synthetics.overview.status.disabled.description',
  {
    defaultMessage: 'Disabled',
  }
);

const errorToastTitle = i18n.translate('xpack.synthetics.overview.status.error.title', {
  defaultMessage: 'Unable to get monitor status metrics',
});
