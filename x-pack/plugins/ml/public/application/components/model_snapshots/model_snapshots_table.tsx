/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect, useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiLoadingSpinner,
  EuiBasicTableColumn,
  formatDate,
} from '@elastic/eui';

import { checkPermission } from '../../capabilities/check_capabilities';
import { EditModelSnapshotFlyout } from './edit_model_snapshot_flyout';
import { RevertModelSnapshotFlyout } from './revert_model_snapshot_flyout';
import { ml } from '../../services/ml_api_service';
import { JOB_STATE, DATAFEED_STATE } from '../../../../common/constants/states';
import { TIME_FORMAT } from '../../../../common/constants/time_format';
import { CloseJobConfirm } from './close_job_confirm';
import {
  ModelSnapshot,
  CombinedJobWithStats,
} from '../../../../common/types/anomaly_detection_jobs';

interface Props {
  job: CombinedJobWithStats;
  refreshJobList: () => void;
}

export enum COMBINED_JOB_STATE {
  OPEN_AND_RUNNING,
  OPEN_AND_STOPPED,
  CLOSED,
  UNKNOWN,
}

export const ModelSnapshotTable: FC<Props> = ({ job, refreshJobList }) => {
  const canCreateJob = checkPermission('canCreateJob');
  const canStartStopDatafeed = checkPermission('canStartStopDatafeed');

  const [snapshots, setSnapshots] = useState<ModelSnapshot[]>([]);
  const [snapshotsLoaded, setSnapshotsLoaded] = useState<boolean>(false);
  const [editSnapshot, setEditSnapshot] = useState<ModelSnapshot | null>(null);
  const [revertSnapshot, setRevertSnapshot] = useState<ModelSnapshot | null>(null);
  const [closeJobModalVisible, setCloseJobModalVisible] = useState<ModelSnapshot | null>(null);
  const [combinedJobState, setCombinedJobState] = useState<COMBINED_JOB_STATE | null>(null);

  useEffect(() => {
    loadModelSnapshots();
  }, []);

  const loadModelSnapshots = useCallback(async () => {
    const { model_snapshots: ms } = await ml.getModelSnapshots(job.job_id);
    setSnapshots(ms);
    setSnapshotsLoaded(true);
  }, [job]);

  const checkJobIsClosed = useCallback(
    async (snapshot: ModelSnapshot) => {
      const state = await getCombinedJobState(job.job_id);
      if (state === COMBINED_JOB_STATE.UNKNOWN) {
        // this will only happen if the job has been deleted by another user
        // between the time the row has been expended and now
        // eslint-disable-next-line no-console
        console.error(`Error retrieving state for job ${job.job_id}`);
        return;
      }

      setCombinedJobState(state);

      if (state === COMBINED_JOB_STATE.CLOSED) {
        // show flyout
        setRevertSnapshot(snapshot);
      } else {
        // show close job modal
        setCloseJobModalVisible(snapshot);
      }
    },
    [job]
  );

  function hideCloseJobModalVisible() {
    setCombinedJobState(null);
    setCloseJobModalVisible(null);
  }

  const forceCloseJob = useCallback(async () => {
    await ml.jobs.forceStopAndCloseJob(job.job_id);
    if (closeJobModalVisible !== null) {
      const state = await getCombinedJobState(job.job_id);
      if (state === COMBINED_JOB_STATE.CLOSED) {
        setRevertSnapshot(closeJobModalVisible);
      }
    }
    hideCloseJobModalVisible();
  }, [job, closeJobModalVisible]);

  const closeEditFlyout = useCallback((reload: boolean) => {
    setEditSnapshot(null);
    if (reload) {
      loadModelSnapshots();
    }
  }, []);

  const closeRevertFlyout = useCallback((reload: boolean) => {
    setRevertSnapshot(null);
    if (reload) {
      loadModelSnapshots();
      // wait half a second before refreshing the jobs list
      setTimeout(refreshJobList, 500);
    }
  }, []);

  const columns: Array<EuiBasicTableColumn<any>> = [
    {
      field: 'snapshot_id',
      name: i18n.translate('xpack.ml.modelSnapshotTable.id', {
        defaultMessage: 'ID',
      }),
      sortable: true,
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
            defaultMessage: 'Revert to this snapshot',
          }),
          enabled: () => canCreateJob && canStartStopDatafeed,
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
          enabled: () => canCreateJob,
          type: 'icon',
          icon: 'pencil',
          onClick: setEditSnapshot,
        },
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
        items={snapshots}
        columns={columns}
        pagination={{
          pageSizeOptions: [5, 10, 25],
        }}
        sorting={{
          sort: {
            field: 'timestamp',
            direction: 'asc',
          },
        }}
      />
      {editSnapshot !== null && (
        <EditModelSnapshotFlyout snapshot={editSnapshot} job={job} closeFlyout={closeEditFlyout} />
      )}

      {revertSnapshot !== null && (
        <RevertModelSnapshotFlyout
          snapshot={revertSnapshot}
          snapshots={snapshots}
          job={job}
          closeFlyout={closeRevertFlyout}
        />
      )}

      {closeJobModalVisible !== null && combinedJobState !== null && (
        <CloseJobConfirm
          combinedJobState={combinedJobState}
          hideCloseJobModalVisible={hideCloseJobModalVisible}
          forceCloseJob={forceCloseJob}
        />
      )}
    </>
  );
};

function renderDate(date: number) {
  return formatDate(date, TIME_FORMAT);
}

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
