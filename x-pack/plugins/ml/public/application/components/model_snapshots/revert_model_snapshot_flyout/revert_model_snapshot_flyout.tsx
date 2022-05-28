/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useCallback, useMemo, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
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
  EuiFormRow,
  EuiSwitch,
  EuiConfirmModal,
  EuiCallOut,
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
import { chartLoaderProvider } from './chart_loader';
import { mlResultsService } from '../../../services/results_service';
import { LineChartPoint } from '../../../jobs/new_job/common/chart_loader';
import { EventRateChart } from '../../../jobs/new_job/pages/components/charts/event_rate_chart/event_rate_chart';
import { Anomaly } from '../../../jobs/new_job/common/results_loader/results_loader';
import { parseInterval } from '../../../../../common/util/parse_interval';
import { CreateCalendar, CalendarEvent } from './create_calendar';
import { timeFormatter } from '../../../../../common/util/date_utils';
import { toastNotificationServiceProvider } from '../../../services/toast_notification_service';

interface Props {
  snapshot: ModelSnapshot;
  snapshots: ModelSnapshot[];
  job: CombinedJobWithStats;
  closeFlyout(): void;
  refresh(): void;
}

export const RevertModelSnapshotFlyout: FC<Props> = ({
  snapshot,
  snapshots,
  job,
  closeFlyout,
  refresh,
}) => {
  const { toasts } = useNotifications();
  const { loadAnomalyDataForJob, loadEventRateForJob } = useMemo(
    () => chartLoaderProvider(mlResultsService),
    []
  );
  const [currentSnapshot, setCurrentSnapshot] = useState(snapshot);
  const [revertModalVisible, setRevertModalVisible] = useState(false);
  const [replay, setReplay] = useState(false);
  const [runInRealTime, setRunInRealTime] = useState(false);
  const [createCalendar, setCreateCalendar] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [calendarEventsValid, setCalendarEventsValid] = useState(true);

  const [eventRateData, setEventRateData] = useState<LineChartPoint[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [chartReady, setChartReady] = useState(false);

  useEffect(() => {
    createChartData();
  }, [currentSnapshot]);

  useEffect(() => {
    const invalid = calendarEvents.some(
      (c) => c.description === '' || c.end === null || c.start === null
    );
    setCalendarEventsValid(invalid === false);

    // a bug in elastic charts selection can
    // cause duplicate selected areas to be added
    // dedupe the calendars based on start and end times
    const calMap = new Map(
      calendarEvents.map((c) => [`${c.start?.valueOf()}${c.end?.valueOf()}`, c])
    );
    const dedupedCalendarEvents = [...calMap.values()];

    if (dedupedCalendarEvents.length < calendarEvents.length) {
      // deduped list is shorter, we must have removed something.
      setCalendarEvents(dedupedCalendarEvents);
    }
  }, [calendarEvents]);

  const createChartData = useCallback(async () => {
    const bucketSpanMs = parseInterval(job.analysis_config.bucket_span)!.asMilliseconds();
    const eventRate = await loadEventRateForJob(job, bucketSpanMs, 100);
    const anomalyData = await loadAnomalyDataForJob(job, bucketSpanMs, 100);
    setEventRateData(eventRate);
    if (anomalyData[0] !== undefined) {
      setAnomalies(anomalyData[0]);
    }
    setChartReady(true);
  }, [job]);

  function showRevertModal() {
    setRevertModalVisible(true);
  }
  function hideRevertModal() {
    setRevertModalVisible(false);
  }

  async function applyRevert() {
    const end =
      replay && runInRealTime === false ? job.data_counts.latest_record_timestamp : undefined;
    try {
      const events =
        replay && createCalendar
          ? calendarEvents.filter(filterIncompleteEvents).map((c) => ({
              start: c.start!.valueOf(),
              end: c.end!.valueOf(),
              description: c.description,
            }))
          : undefined;

      ml.jobs
        .revertModelSnapshot(job.job_id, currentSnapshot.snapshot_id, replay, end, events)
        .then(() => {
          toasts.addSuccess(
            i18n.translate('xpack.ml.revertModelSnapshotFlyout.revertSuccessTitle', {
              defaultMessage: 'Model snapshot revert successful',
            })
          );
          refresh();
        })
        .catch((error) => {
          const { displayErrorToast } = toastNotificationServiceProvider(toasts);
          displayErrorToast(error);
        });
      hideRevertModal();
      closeFlyout();
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
      <EuiFlyout onClose={closeFlyout} hideCloseButton size="m">
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="s">
            <h5>
              <FormattedMessage
                id="xpack.ml.newJob.wizard.revertModelSnapshotFlyout.title"
                defaultMessage="Revert to model snapshot {ssId}"
                values={{ ssId: currentSnapshot.snapshot_id }}
              />
            </h5>
          </EuiTitle>

          <EuiText size="s">
            <p>{currentSnapshot.description}</p>
          </EuiText>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          {false && ( // disabled for now
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
              <EuiHorizontalRule margin="m" />
              <EuiSpacer size="l" />
            </>
          )}

          <EventRateChart
            eventRateChartData={eventRateData}
            anomalyData={anomalies}
            loading={chartReady === false}
            height={'100px'}
            width={'100%'}
            fadeChart={true}
            overlayRanges={[
              {
                start: currentSnapshot.latest_record_time_stamp!,
                end: job.data_counts.latest_record_timestamp!,
                color: '#ff0000',
              },
            ]}
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
              values={{ date: timeFormatter(currentSnapshot.latest_record_time_stamp!) }}
            />
          </EuiCallOut>

          <EuiHorizontalRule margin="xl" />

          <EuiFormRow
            fullWidth
            helpText={i18n.translate(
              'xpack.ml.newJob.wizard.revertModelSnapshotFlyout.replaySwitchHelp',
              {
                defaultMessage: 'Reopen job and replay analysis after the revert has been applied.',
              }
            )}
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
                helpText={i18n.translate(
                  'xpack.ml.newJob.wizard.revertModelSnapshotFlyout.realTimeSwitchHelp',
                  {
                    defaultMessage:
                      'Job will continue to run until manually stopped. All new data added to the index will be analyzed.',
                  }
                )}
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
                helpText={i18n.translate(
                  'xpack.ml.newJob.wizard.revertModelSnapshotFlyout.createCalendarSwitchHelp',
                  {
                    defaultMessage:
                      'Create a new calendar and event to skip over a period of time when analyzing the data.',
                  }
                )}
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
                <CreateCalendar
                  calendarEvents={calendarEvents}
                  setCalendarEvents={setCalendarEvents}
                  minSelectableTimeStamp={snapshot.latest_record_time_stamp!}
                  maxSelectableTimeStamp={job.data_counts.latest_record_timestamp!}
                  eventRateData={eventRateData}
                  anomalies={anomalies}
                  chartReady={chartReady}
                />
              )}
            </>
          )}
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty iconType="cross" onClick={closeFlyout} flush="left">
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
                disabled={createCalendar === true && calendarEventsValid === false}
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
        <EuiConfirmModal
          title={i18n.translate('xpack.ml.newJob.wizard.revertModelSnapshotFlyout.deleteTitle', {
            defaultMessage: 'Apply snapshot revert',
          })}
          onCancel={hideRevertModal}
          onConfirm={applyRevert}
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
        >
          <FormattedMessage
            id="xpack.ml.newJob.wizard.revertModelSnapshotFlyout.modalBody"
            defaultMessage="The snapshot revert will be carried out in the background and may take some time."
          />
        </EuiConfirmModal>
      )}
    </>
  );
};

function filterIncompleteEvents(event: CalendarEvent): event is CalendarEvent {
  return event.start !== null && event.end !== null;
}
