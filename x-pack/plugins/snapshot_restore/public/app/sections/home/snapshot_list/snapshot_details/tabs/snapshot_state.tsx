/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiIconTip, EuiLoadingSpinner } from '@elastic/eui';

import { useAppDependencies } from '../../../../../index';

interface Props {
  state: any;
}

const STATE_IN_PROGRESS = 'IN_PROGRESS';
const STATE_SUCCESS = 'SUCCESS';
const STATE_FAILED = 'FAILED';
const STATE_PARTIAL = 'PARTIAL';
const STATE_INCOMPATIBLE = 'INCOMPATIBLE';

export const SnapshotState: React.SFC<Props> = ({ state }) => {
  const {
    core: {
      i18n: { translate },
    },
  } = useAppDependencies();

  const stateMap: any = {
    [STATE_IN_PROGRESS]: {
      icon: <EuiLoadingSpinner size="m" />,
      label: translate('xpack.snapshotRestore.snapshotState.inProgressLabel', {
        defaultMessage: 'Taking snapshot…',
      }),
    },
    [STATE_SUCCESS]: {
      icon: <EuiIcon color="success" type="check" />,
      label: translate('xpack.snapshotRestore.snapshotState.inProgressLabel', {
        defaultMessage: 'Snapshot complete',
      }),
    },
    [STATE_FAILED]: {
      icon: <EuiIcon color="danger" type="cross" />,
      label: translate('xpack.snapshotRestore.snapshotState.failedLabel', {
        defaultMessage: 'Snapshot failed',
      }),
    },
    [STATE_PARTIAL]: {
      icon: <EuiIcon color="warning" type="alert" />,
      label: translate('xpack.snapshotRestore.snapshotState.partialLabel', {
        defaultMessage: 'Partial failure',
      }),
      tip: translate('xpack.snapshotRestore.snapshotState.partialTipDescription', {
        defaultMessage: `Global cluster state was stored, but at least one shard wasn't stored successfully. See the 'Failed indices' tab.`,
      }),
    },
    [STATE_INCOMPATIBLE]: {
      icon: <EuiIcon color="warning" type="alert" />,
      label: translate('xpack.snapshotRestore.snapshotState.incompatibleLabel', {
        defaultMessage: 'Incompatible version',
      }),
      tip: translate('xpack.snapshotRestore.snapshotState.partialTipDescription', {
        defaultMessage: `Snapshot was created with a version of Elasticsearch incompatible with the cluster's version.`,
      }),
    },
  };

  if (!stateMap[state]) {
    // Help debug unexpected state.
    return state;
  }

  const { icon, label, tip } = stateMap[state];

  const iconTip = tip && (
    <Fragment>
      {' '}
      <EuiIconTip content={tip} />
    </Fragment>
  );

  return (
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
};
