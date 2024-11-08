/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiIconTip, EuiToolTip } from '@elastic/eui';

import { SNAPSHOT_STATE } from '../../../../../constants';
import { useServices } from '../../../../../app_context';

interface Props {
  state: any;
  tooltipIcon: boolean;
}

export const SnapshotState: React.FC<Props> = ({ state, tooltipIcon }) => {
  const { i18n } = useServices();

  const stateMap: any = {
    [SNAPSHOT_STATE.IN_PROGRESS]: {
      icon: <EuiIcon color="primary" type="dot" />,
      label: i18n.translate('xpack.snapshotRestore.snapshotState.inProgressLabel', {
        defaultMessage: 'In Progress',
      }),
    },
    [SNAPSHOT_STATE.SUCCESS]: {
      icon: <EuiIcon color="success" type="dot" />,
      label: i18n.translate('xpack.snapshotRestore.snapshotState.completeLabel', {
        defaultMessage: 'Complete',
      }),
    },
    [SNAPSHOT_STATE.FAILED]: {
      icon: <EuiIcon color="danger" type="dot" />,
      label: i18n.translate('xpack.snapshotRestore.snapshotState.failedLabel', {
        defaultMessage: 'Failed',
      }),
    },
    [SNAPSHOT_STATE.PARTIAL]: {
      icon: <EuiIcon color="warning" type="dot" />,
      label: i18n.translate('xpack.snapshotRestore.snapshotState.partialLabel', {
        defaultMessage: 'Partial',
      }),
      tip: i18n.translate('xpack.snapshotRestore.snapshotState.partialTipDescription', {
        defaultMessage: `Global cluster state was stored, but at least one shard wasn't stored successfully. See the 'Failed indices' tab.`,
      }),
    },
  };

  if (!stateMap[state]) {
    // Help debug unexpected state.
    return state;
  }

  const { icon, label, tip } = stateMap[state];

  const iconTip = tip && tooltipIcon && (
    <Fragment>
      {' '}
      <EuiIconTip content={tip} />
    </Fragment>
  );

  const snapshotInfo = (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>{icon}</EuiFlexItem>

      <EuiFlexItem grow={false}>
        {/* Escape flex layout created by EuiFlexItem. */}
        <div>
          {label}
          {iconTip}
        </div>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return tip && tooltipIcon ? (
    snapshotInfo
  ) : (
    <EuiToolTip position="top" content={tip}>
      {snapshotInfo}
    </EuiToolTip>
  );
};
