/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlyout,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiTitle,
  EuiFlyoutBody,
  EuiSpacer,
  EuiTextArea,
  EuiFormRow,
  EuiCheckbox,
  EuiConfirmModal,
  EuiOverlayMask,
  EuiCallOut,
  EuiDatePicker,
  EuiHorizontalRule,
} from '@elastic/eui';

import {
  ModelSnapshot,
  CombinedJobWithStats,
} from '../../../../../common/types/anomaly_detection_jobs';
import { ml } from '../../../services/ml_api_service';
import { useNotifications } from '../../../contexts/kibana';
import { loadEventRateForJob, loadAnomalyDataForJob } from './utils';
import { EventRateChart } from '../../../jobs/new_job/pages/components/charts/event_rate_chart/event_rate_chart';
import { Anomaly } from '../../../jobs/new_job/common/results_loader/results_loader';

interface Props {
  snapshot: ModelSnapshot;
  snapshots: ModelSnapshot[];
  job: CombinedJobWithStats;
  closeFlyout(reload: boolean): void;
}

export const RevertModelSnapshotFlyout: FC<Props> = ({ snapshot, snapshots, job, closeFlyout }) => {
  const { toasts } = useNotifications();
  const [currentSnapshot, setCurrentSnapshot] = useState(snapshot);
  const [revertModalVisible, setRevertModalVisible] = useState(false);
  const [replay, setReplay] = useState(true);
  const [runInRealTime, setRunInRealTime] = useState(true);
  const [createCalendar, setCreateCalendar] = useState(false);
  const [startDate, setStartDate] = useState<moment.Moment | null>(
    moment(snapshot.latest_record_time_stamp)
  );
  const [endDate, setEndDate] = useState<moment.Moment | null>(
    moment(job.data_counts.latest_record_timestamp)
  );

  const [eventRateData, setEventRateData] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [chartReady, setChartReady] = useState(false);

  useEffect(() => {
    createChartData();
  }, []);

  async function createChartData() {
    const d = await loadEventRateForJob(job, 100);
    const a = await loadAnomalyDataForJob(job, 100);
    setEventRateData(d);
    setAnomalies(a[0]);
    setChartReady(true);
  }

  function closeWithReload() {
    closeFlyout(true);
  }
  function closeWithoutReload() {
    closeFlyout(false);
  }

  function showRevertModal() {
    setRevertModalVisible(true);
  }
  function hideRevertModal() {
    setRevertModalVisible(false);
  }

  async function revert() {
    const end =
      replay && runInRealTime === false ? job.data_counts.latest_record_timestamp : undefined;
    try {
      await ml.jobs.revertModelSnapshot(
        job.job_id,
        currentSnapshot.snapshot_id,
        replay,
        end,
        createCalendar && startDate !== null && endDate !== null
          ? { start: startDate.valueOf(), end: endDate.valueOf() }
          : undefined
      );
      hideRevertModal();
      closeWithReload();
    } catch (error) {
      toasts.addError(new Error(error.body.message), {
        title: i18n.translate('xpack.ml.revertModelSnapshotFlyout.revertErrorTitle', {
          defaultMessage: 'Model snapshot revert failed',
        }),
      });
    }
  }

  return (
    <>
      <EuiFlyout onClose={closeWithoutReload} hideCloseButton size="m">
        <EuiFlyoutBody>
          <EuiTitle size="s">
            <h5>
              <FormattedMessage
                id="xpack.ml.newJob.wizard.revertModelSnapshotFlyout.title"
                defaultMessage="Revert snapshot {ssId}"
                values={{ ssId: currentSnapshot.snapshot_id }}
              />
            </h5>
          </EuiTitle>

          <EuiSpacer size="l" />

          <EventRateChart
            eventRateChartData={eventRateData}
            anomalyData={anomalies}
            loading={chartReady === false}
            height={'100px'}
            width={'100%'}
            fadeChart={true}
            overlayRange={{
              start: snapshot.latest_record_time_stamp,
              end: job.data_counts.latest_record_timestamp,
            }}
          />

          <EuiSpacer size="l" />
          <EuiHorizontalRule />

          <EuiFormRow fullWidth>
            <EuiCheckbox
              id="replaySwitch"
              label={i18n.translate(
                'xpack.ml.newJob.wizard.revertModelSnapshotFlyout.replaySwitchLabel',
                {
                  defaultMessage: 'Reopen job and replay analysis after revert has been applied?',
                }
              )}
              checked={replay}
              onChange={(e) => setReplay(e.target.checked)}
            />
          </EuiFormRow>
          <EuiFormRow fullWidth>
            <EuiCheckbox
              id="realTimeSwitch"
              label={i18n.translate(
                'xpack.ml.newJob.wizard.revertModelSnapshotFlyout.realTimeSwitchLabel',
                {
                  defaultMessage: 'Run job in real time',
                }
              )}
              checked={runInRealTime}
              disabled={replay === false}
              onChange={(e) => setRunInRealTime(e.target.checked)}
            />
          </EuiFormRow>

          <EuiFormRow fullWidth>
            <EuiCheckbox
              id="createCalendarSwitch"
              label={i18n.translate(
                'xpack.ml.newJob.wizard.revertModelSnapshotFlyout.createCalendarSwitchLabel',
                {
                  defaultMessage: 'Skip some time',
                }
              )}
              checked={createCalendar}
              disabled={replay === false}
              onChange={(e) => setCreateCalendar(e.target.checked)}
            />
          </EuiFormRow>

          <EuiSpacer size="l" />

          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem>
              <EuiFormRow label="From">
                <EuiDatePicker
                  disabled={createCalendar === false || replay === false}
                  showTimeSelect
                  selected={startDate}
                  minDate={moment(snapshot.latest_record_time_stamp)}
                  maxDate={endDate || moment(job.data_counts.latest_record_timestamp)}
                  onChange={(d) => setStartDate(d)}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow label="To">
                <EuiDatePicker
                  disabled={createCalendar === false || replay === false}
                  showTimeSelect
                  selected={endDate}
                  minDate={startDate || moment(snapshot.latest_record_time_stamp)}
                  onChange={(d) => setEndDate(d)}
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty iconType="cross" onClick={closeWithoutReload} flush="left">
                <FormattedMessage
                  id="xpack.ml.newJob.wizard.categorizationAnalyzerFlyout.closeButton"
                  defaultMessage="Close"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={true} />

            <EuiFlexItem grow={false}>
              <EuiButton onClick={showRevertModal} fill>
                <FormattedMessage
                  id="xpack.ml.newJob.wizard.categorizationAnalyzerFlyout.saveButton"
                  defaultMessage="Apply"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>

      {revertModalVisible && (
        <EuiOverlayMask>
          <EuiConfirmModal
            title={i18n.translate('xpack.ml.newJob.wizard.revertModelSnapshotFlyout.deleteTitle', {
              defaultMessage: 'Apply snapshot revert',
            })}
            onCancel={hideRevertModal}
            onConfirm={revert}
            cancelButtonText={i18n.translate(
              'xpack.ml.newJob.wizard.revertModelSnapshotFlyout.cancelButton',
              {
                defaultMessage: 'Cancel',
              }
            )}
            confirmButtonText={i18n.translate(
              'xpack.ml.newJob.wizard.revertModelSnapshotFlyout.deleteButton',
              {
                defaultMessage: 'Apply',
              }
            )}
            buttonColor="danger"
            defaultFocusedButton="confirm"
          />
        </EuiOverlayMask>
      )}
    </>
  );
};
