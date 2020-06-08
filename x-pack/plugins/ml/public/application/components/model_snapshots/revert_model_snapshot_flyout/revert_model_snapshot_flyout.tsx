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
// @ts-ignore
import { formatDate } from '@elastic/eui/lib/services/format';
import { XYBrushArea } from '@elastic/charts';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
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
  EuiSwitch,
  EuiConfirmModal,
  EuiOverlayMask,
  EuiCallOut,
  EuiDatePicker,
  EuiHorizontalRule,
  EuiSuperSelect,
  EuiText,
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
import { parseInterval } from '../../../../../common/util/parse_interval';

const TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

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
  const [replay, setReplay] = useState(false);
  const [runInRealTime, setRunInRealTime] = useState(false);
  const [createCalendar, setCreateCalendar] = useState(false);
  const [startDate, setStartDate] = useState<moment.Moment | null>(
    // moment(currentSnapshot.latest_record_time_stamp)
    null
  );
  const [endDate, setEndDate] = useState<moment.Moment | null>(
    // moment(job.data_counts.latest_record_timestamp)
    null
  );

  const [eventRateData, setEventRateData] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [chartReady, setChartReady] = useState(false);

  // useEffect(() => {
  //   createChartData();
  // }, []);

  useEffect(() => {
    createChartData();
  }, [currentSnapshot]);

  async function createChartData() {
    // setTimeout(async () => {
    const bucketSpanMs = parseInterval(job.analysis_config.bucket_span)!.asMilliseconds();
    const d = await loadEventRateForJob(job, bucketSpanMs, 100);
    const a = await loadAnomalyDataForJob(job, bucketSpanMs, 100);
    setEventRateData(d);
    setAnomalies(a[0]);
    setChartReady(true);
    // }, 250);
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

  function onBrushEnd({ x }: XYBrushArea) {
    if (x && x.length === 2) {
      const end = x[1] < currentSnapshot.latest_record_time_stamp ? null : x[1];
      if (end !== null) {
        const start =
          x[0] < currentSnapshot.latest_record_time_stamp
            ? currentSnapshot.latest_record_time_stamp
            : x[0];
        setStartDate(moment(start));
        setEndDate(moment(end));
      }
    }
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

  function onSnapshotChange(ssId: string) {
    const ss = snapshots.find((s) => s.snapshot_id === ssId);
    if (ss !== undefined) {
      setCurrentSnapshot(ss);
    }
  }

  return (
    <>
      <EuiFlyout onClose={closeWithoutReload} hideCloseButton size="m">
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="s">
            <h5>
              <FormattedMessage
                id="xpack.ml.newJob.wizard.revertModelSnapshotFlyout.title"
                defaultMessage="Revert snapshot {ssId}"
                values={{ ssId: currentSnapshot.snapshot_id }}
              />
            </h5>
          </EuiTitle>

          <EuiText size="s">
            <p>{currentSnapshot.description}</p>
          </EuiText>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          {false && (
            <>
              <EuiSpacer size="s" />

              <EuiFormRow
                fullWidth
                label={i18n.translate(
                  'xpack.ml.newJob.wizard.revertModelSnapshotFlyout.changeSnapshotLabel',
                  {
                    defaultMessage: 'Change snapshot',
                  }
                )}
              >
                <EuiSuperSelect
                  options={snapshots
                    .map((s) => ({
                      value: s.snapshot_id,
                      inputDisplay: s.snapshot_id,
                      dropdownDisplay: (
                        <>
                          <strong>{s.snapshot_id}</strong>
                          <EuiText size="s" color="subdued">
                            <p className="euiTextColor--subdued">{s.description}</p>
                          </EuiText>
                        </>
                      ),
                    }))
                    .reverse()}
                  valueOfSelected={currentSnapshot.snapshot_id}
                  onChange={onSnapshotChange}
                  itemLayoutAlign="top"
                  hasDividers
                />
              </EuiFormRow>
            </>
          )}
          {/* <EuiHorizontalRule margin="m" /> */}
          {/* <EuiSpacer size="l" /> */}

          <EventRateChart
            eventRateChartData={eventRateData}
            anomalyData={anomalies}
            loading={chartReady === false}
            height={'100px'}
            width={'100%'}
            fadeChart={true}
            overlayRange={{
              start: currentSnapshot.latest_record_time_stamp,
              end: job.data_counts.latest_record_timestamp,
              color: '#ff0000',
            }}
          />

          <EuiSpacer size="l" />
          <EuiSpacer size="l" />

          <EuiCallOut
            title={i18n.translate(
              'xpack.ml.newJob.wizard.revertModelSnapshotFlyout.warningCallout.title',
              {
                defaultMessage: 'Anomaly data will be deleted',
              }
            )}
            color="warning"
            iconType="alert"
          >
            <FormattedMessage
              id="xpack.ml.newJob.wizard.revertModelSnapshotFlyout.warningCallout.contents"
              defaultMessage="All anomaly detection results after {date} will be deleted."
              values={{ date: formatDate(currentSnapshot.latest_record_time_stamp, TIME_FORMAT) }}
            />
          </EuiCallOut>

          <EuiHorizontalRule margin="xl" />

          <EuiFormRow
            fullWidth
            helpText="Reopen job and replay analysis after the revert has been applied."
          >
            <EuiSwitch
              id="replaySwitch"
              label={i18n.translate(
                'xpack.ml.newJob.wizard.revertModelSnapshotFlyout.replaySwitchLabel',
                {
                  defaultMessage: 'Replay analysis',
                }
              )}
              checked={replay}
              onChange={(e) => setReplay(e.target.checked)}
            />
          </EuiFormRow>

          {replay && (
            <>
              <EuiFormRow
                fullWidth
                helpText={
                  runInRealTime
                    ? 'Job will continue to run until manually stopped. All new data added to the index will be analyzed.'
                    : `Job will run for the same length of time as it is currently (${formatDate(
                        job.data_counts.latest_record_timestamp,
                        TIME_FORMAT
                      )}). It will then stop and close.`
                }
              >
                <EuiSwitch
                  id="realTimeSwitch"
                  label={i18n.translate(
                    'xpack.ml.newJob.wizard.revertModelSnapshotFlyout.realTimeSwitchLabel',
                    {
                      defaultMessage: 'Run job in real time',
                    }
                  )}
                  checked={runInRealTime}
                  onChange={(e) => setRunInRealTime(e.target.checked)}
                />
              </EuiFormRow>

              <EuiFormRow
                fullWidth
                helpText="Create a new calendar and event to skip over a period of time when analyzing the data."
                // helpText="Create a new calendar and event to skip over a period of time when analyzing the data. To use an existing calendar, do not use this setting and ensure the existing calendar is attached to the job before rerunning it."
              >
                <EuiSwitch
                  id="createCalendarSwitch"
                  label={i18n.translate(
                    'xpack.ml.newJob.wizard.revertModelSnapshotFlyout.createCalendarSwitchLabel',
                    {
                      defaultMessage: 'Create calendar to skip a range of time',
                    }
                  )}
                  checked={createCalendar}
                  onChange={(e) => setCreateCalendar(e.target.checked)}
                />
              </EuiFormRow>

              {createCalendar && (
                <>
                  <EuiSpacer size="l" />
                  <div>Select time range for calendar event.</div>
                  <EuiSpacer size="m" />
                  <EventRateChart
                    eventRateChartData={eventRateData}
                    anomalyData={anomalies}
                    loading={chartReady === false}
                    height={'100px'}
                    width={'100%'}
                    fadeChart={true}
                    overlayRange={
                      startDate !== null && endDate !== null
                        ? {
                            start: startDate.valueOf(),
                            end: endDate.valueOf(),
                            color: '#0000ff',
                            showMarker: false,
                          }
                        : undefined
                    }
                    onBrushEnd={onBrushEnd}
                  />
                  <EuiSpacer size="s" />

                  <EuiFlexGroup justifyContent="spaceBetween">
                    <EuiFlexItem>
                      <EuiFormRow label="From">
                        <EuiDatePicker
                          showTimeSelect
                          selected={startDate}
                          minDate={moment(currentSnapshot.latest_record_time_stamp)}
                          maxDate={endDate || moment(job.data_counts.latest_record_timestamp)}
                          onChange={(d) => setStartDate(d)}
                        />
                      </EuiFormRow>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiFormRow label="To">
                        <EuiDatePicker
                          showTimeSelect
                          selected={endDate}
                          minDate={startDate || moment(currentSnapshot.latest_record_time_stamp)}
                          onChange={(d) => setEndDate(d)}
                        />
                      </EuiFormRow>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </>
              )}
            </>
          )}
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty iconType="cross" onClick={closeWithoutReload} flush="left">
                <FormattedMessage
                  id="xpack.ml.newJob.wizard.revertModelSnapshotFlyout.closeButton"
                  defaultMessage="Close"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={true} />

            <EuiFlexItem grow={false}>
              <EuiButton
                onClick={showRevertModal}
                disabled={createCalendar === true && (startDate === null || endDate === null)}
                fill
              >
                <FormattedMessage
                  id="xpack.ml.newJob.wizard.revertModelSnapshotFlyout.saveButton"
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
