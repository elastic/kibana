/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';

// @ts-ignore
import { formatDate } from '@elastic/eui/lib/services/format';

import {
  // EuiBadge,
  // EuiButtonIcon,
  // EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  // EuiLink,
  EuiLoadingSpinner,
  EuiOverlayMask,
  EuiConfirmModal,
  // EuiToolTip,
} from '@elastic/eui';

import { EditModelSnapshotFlyout } from './edit_model_snapshot_flyout';
import { RevertModelSnapshotFlyout } from './revert_model_snapshot_flyout';
import { ml } from '../../services/ml_api_service';
import { JOB_STATE, DATAFEED_STATE } from '../../../../common/constants/states';
import {
  ModelSnapshot,
  CombinedJobWithStats,
} from '../../../../common/types/anomaly_detection_jobs';

const TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

interface Props {
  job: CombinedJobWithStats;
}

enum COMBINED_JOB_STATE {
  OPEN_AND_RUNNING,
  OPEN_AND_STOPPED,
  CLOSED,
  UNKNOWN,
}

export const ModelSnapshotTable: FC<Props> = ({ job }) => {
  const [snapshots, setSnapshots] = useState<ModelSnapshot[]>([]);
  const [snapshotsLoaded, setSnapshotsLoaded] = useState<boolean>(false);
  const [editSnapshot, setEditSnapshot] = useState<ModelSnapshot | null>(null);
  const [revertSnapshot, setRevertSnapshot] = useState<ModelSnapshot | null>(null);
  const [closeJobModalVisible, setCloseJobModalVisible] = useState(false);
  const [combinedJobState, setCombinedJobState] = useState<COMBINED_JOB_STATE | null>(null);

  useEffect(() => {
    loadModelSnapshots();
  }, []);

  async function loadModelSnapshots() {
    const { model_snapshots: ms } = await ml.getModelSnapshots(job.job_id);
    setSnapshots(ms);
    setSnapshotsLoaded(true);
  }

  async function checkJobIsClosed(snapshot: ModelSnapshot) {
    const state = await getCombinedJobState(job.job_id);
    if (state === COMBINED_JOB_STATE.UNKNOWN) {
      // show toast
      return;
    }

    if (state === COMBINED_JOB_STATE.CLOSED) {
      // show flyout
      setRevertSnapshot(snapshot);
    } else {
      setCombinedJobState(state);
      showCloseJobModalVisible();
    }
  }

  function showCloseJobModalVisible() {
    setCloseJobModalVisible(true);
  }
  function hideCloseJobModalVisible() {
    setCombinedJobState(null);
    setCloseJobModalVisible(false);
  }

  async function forceCloseJob() {
    ml.jobs.forceStopAndCloseJob(job.job_id);
    hideCloseJobModalVisible();
  }

  function renderDate(date: number) {
    return formatDate(date, TIME_FORMAT);
  }

  const columns = [
    {
      field: 'snapshot_id',
      name: i18n.translate('xpack.ml.modelSnapshotTable.id', {
        defaultMessage: 'ID',
      }),
      sortable: true,
      // width: '50%',
      // scope: 'row',
    },
    {
      field: 'description',
      name: i18n.translate('xpack.ml.modelSnapshotTable.description', {
        defaultMessage: 'Description',
      }),
      sortable: true,
    },
    {
      field: 'timestamp',
      name: i18n.translate('xpack.ml.modelSnapshotTable.time', {
        defaultMessage: 'Date created',
      }),
      dataType: 'date',
      render: renderDate,
      sortable: true,
    },
    {
      field: 'latest_record_time_stamp',
      name: i18n.translate('xpack.ml.modelSnapshotTable.latestTimestamp', {
        defaultMessage: 'Latest timestamp',
      }),
      dataType: 'date',
      render: renderDate,
      sortable: true,
    },
    {
      field: 'retain',
      name: i18n.translate('xpack.ml.modelSnapshotTable.retain', {
        defaultMessage: 'Retain',
      }),
      width: '100px',
      sortable: true,
    },
    {
      field: '',
      width: '100px',
      name: i18n.translate('xpack.ml.modelSnapshotTable.actions', {
        defaultMessage: 'Actions',
      }),
      actions: [
        {
          name: i18n.translate('xpack.ml.modelSnapshotTable.actions.revert.name', {
            defaultMessage: 'Revert',
          }),
          description: i18n.translate('xpack.ml.modelSnapshotTable.actions.revert.description', {
            defaultMessage: 'Revert this snapshot',
          }),
          type: 'icon',
          icon: 'crosshairs',
          onClick: checkJobIsClosed,
        },
        {
          name: i18n.translate('xpack.ml.modelSnapshotTable.actions.edit.name', {
            defaultMessage: 'Edit',
          }),
          description: i18n.translate('xpack.ml.modelSnapshotTable.actions.edit.description', {
            defaultMessage: 'Edit this snapshot',
          }),
          type: 'icon',
          icon: 'pencil',
          onClick: setEditSnapshot,
        },
        // {
        //   name: i18n.translate('xpack.ml.modelSnapshotTable.actions.delete.name', {
        //     defaultMessage: 'Delete',
        //   }),
        //   description: i18n.translate('xpack.ml.modelSnapshotTable.actions.delete.description', {
        //     defaultMessage: 'Delete this snapshot',
        //   }),
        //   type: 'icon',
        //   icon: 'trash',
        //   onClick: (a) => {
        //     console.log(a);
        //   },
        // },
      ],
    },
  ];

  if (snapshotsLoaded === false) {
    return (
      <>
        <EuiFlexGroup justifyContent="spaceAround">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="l" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  }

  return (
    <>
      <EuiInMemoryTable
        className="eui-textOverflowWrap"
        compressed={true}
        items={snapshots as any[]} // TODO EUI TABLES SUCK
        columns={columns as any[]}
        pagination={{
          pageSizeOptions: [5, 10, 25],
        }}
        sorting={{
          sort: {
            field: 'timestamp',
            direction: 'asc',
          },
        }}
        // rowProps={getRowProps}
      />
      {editSnapshot !== null && (
        <EditModelSnapshotFlyout
          snapshot={editSnapshot}
          job={job}
          closeFlyout={(reload: boolean) => {
            setEditSnapshot(null);
            if (reload) {
              loadModelSnapshots();
            }
          }}
        />
      )}

      {revertSnapshot !== null && (
        <RevertModelSnapshotFlyout
          snapshot={revertSnapshot}
          snapshots={snapshots}
          job={job}
          closeFlyout={(reload: boolean) => {
            setRevertSnapshot(null);
            if (reload) {
              loadModelSnapshots();
            }
          }}
        />
      )}

      {closeJobModalVisible && combinedJobState !== null && (
        <EuiOverlayMask>
          <EuiConfirmModal
            title={i18n.translate('xpack.ml.modelSnapshotTable.closeJobConfirm.title', {
              defaultMessage: 'Close job?',
            })}
            onCancel={hideCloseJobModalVisible}
            onConfirm={forceCloseJob}
            cancelButtonText={i18n.translate(
              'xpack.ml.modelSnapshotTable.closeJobConfirm.cancelButton',
              {
                defaultMessage: 'Cancel',
              }
            )}
            confirmButtonText={i18n.translate(
              'xpack.ml.modelSnapshotTable.closeJobConfirm.deleteButton',
              {
                defaultMessage: 'Force close',
              }
            )}
            defaultFocusedButton="confirm"
          >
            <p>Close this job blah</p>
          </EuiConfirmModal>
        </EuiOverlayMask>
      )}
    </>
  );
};

async function getCombinedJobState(jobId: string) {
  const jobs = await ml.jobs.jobs([jobId]);

  if (jobs.length !== 1) {
    return COMBINED_JOB_STATE.UNKNOWN;
  }

  if (jobs[0].state !== JOB_STATE.CLOSED) {
    if (jobs[0].datafeed_config.state !== DATAFEED_STATE.STOPPED) {
      return COMBINED_JOB_STATE.OPEN_AND_RUNNING;
    }
    return COMBINED_JOB_STATE.OPEN_AND_STOPPED;
  }
  return COMBINED_JOB_STATE.CLOSED;
}
