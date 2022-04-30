/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, Fragment, useCallback, memo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import moment from 'moment';
import { XYBrushEvent, BrushEndListener } from '@elastic/charts';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiFormRow,
  EuiFieldText,
  EuiDatePicker,
  EuiButtonIcon,
  EuiPanel,
} from '@elastic/eui';

import { EventRateChart } from '../../../jobs/new_job/pages/components/charts/event_rate_chart/event_rate_chart';
import { Anomaly } from '../../../jobs/new_job/common/results_loader/results_loader';
import { useCurrentEuiTheme } from '../../../components/color_range_legend';
import { LineChartPoint } from '../../../jobs/new_job/common/chart_loader/chart_loader';

export interface CalendarEvent {
  start: moment.Moment | null;
  end: moment.Moment | null;
  description: string;
}

interface Props {
  calendarEvents: CalendarEvent[];
  setCalendarEvents: (calendars: CalendarEvent[]) => void;
  minSelectableTimeStamp: number;
  maxSelectableTimeStamp: number;
  eventRateData: LineChartPoint[];
  anomalies: Anomaly[];
  chartReady: boolean;
}

export const CreateCalendar: FC<Props> = ({
  calendarEvents,
  setCalendarEvents,
  minSelectableTimeStamp,
  maxSelectableTimeStamp,
  eventRateData,
  anomalies,
  chartReady,
}) => {
  const maxSelectableTimeMoment = moment(maxSelectableTimeStamp);
  const minSelectableTimeMoment = moment(minSelectableTimeStamp);

  const { euiTheme } = useCurrentEuiTheme();

  const onBrushEnd = useCallback(
    ({ x }: XYBrushEvent) => {
      if (x && x.length === 2) {
        const end = x[1] < minSelectableTimeStamp ? null : x[1];
        if (end !== null) {
          const start = x[0] < minSelectableTimeStamp ? minSelectableTimeStamp : x[0];

          setCalendarEvents([
            ...calendarEvents,
            {
              start: moment(start),
              end: moment(end),
              description: createDefaultEventDescription(calendarEvents.length + 1),
            },
          ]);
        }
      }
    },
    [calendarEvents]
  );

  const setStartDate = useCallback(
    (start: moment.Moment | null, index: number) => {
      const event = calendarEvents[index];
      if (event === undefined) {
        setCalendarEvents([
          ...calendarEvents,
          { start, end: null, description: createDefaultEventDescription(index) },
        ]);
      } else {
        event.start = start;
        setCalendarEvents([...calendarEvents]);
      }
    },
    [calendarEvents]
  );

  const setEndDate = useCallback(
    (end: moment.Moment | null, index: number) => {
      const event = calendarEvents[index];
      if (event === undefined) {
        setCalendarEvents([
          ...calendarEvents,
          { start: null, end, description: createDefaultEventDescription(index) },
        ]);
      } else {
        event.end = end;
        setCalendarEvents([...calendarEvents]);
      }
    },
    [calendarEvents]
  );

  const setDescription = useCallback(
    (description: string, index: number) => {
      const event = calendarEvents[index];
      if (event !== undefined) {
        event.description = description;
        setCalendarEvents([...calendarEvents]);
      }
    },
    [calendarEvents]
  );

  const removeCalendarEvent = useCallback(
    (index: number) => {
      if (calendarEvents[index] !== undefined) {
        const ce = [...calendarEvents];
        ce.splice(index, 1);
        setCalendarEvents(ce);
      }
    },
    [calendarEvents]
  );

  return (
    <>
      <EuiSpacer size="l" />
      <div>
        <FormattedMessage
          id="xpack.ml.revertModelSnapshotFlyout.createCalendar.title"
          defaultMessage="Select time range for calendar event."
        />
      </div>
      <EuiSpacer size="m" />
      <Chart
        eventRateData={eventRateData}
        anomalies={anomalies}
        loading={chartReady === false}
        overlayRanges={calendarEvents.filter(filterIncompleteEvents).map((c) => ({
          start: c.start!.valueOf(),
          end: c.end!.valueOf(),
        }))}
        onBrushEnd={onBrushEnd}
        overlayColor={euiTheme.euiColorPrimary}
      />
      <EuiSpacer size="s" />

      {calendarEvents.map((c, i) => (
        <Fragment key={i}>
          <EuiPanel paddingSize="s">
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiFlexGroup>
                  <EuiFlexItem>
                    <EuiFormRow
                      label={i18n.translate(
                        'xpack.ml.revertModelSnapshotFlyout.createCalendar.fromLabel',
                        {
                          defaultMessage: 'From',
                        }
                      )}
                    >
                      <EuiDatePicker
                        showTimeSelect
                        selected={c.start}
                        minDate={minSelectableTimeMoment}
                        maxDate={c.end ?? maxSelectableTimeMoment}
                        onChange={(d) => setStartDate(d, i)}
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiFormRow
                      label={i18n.translate(
                        'xpack.ml.revertModelSnapshotFlyout.createCalendar.toLabel',
                        {
                          defaultMessage: 'To',
                        }
                      )}
                    >
                      <EuiDatePicker
                        showTimeSelect
                        selected={c.end}
                        minDate={c.start ?? minSelectableTimeMoment}
                        maxDate={maxSelectableTimeMoment}
                        onChange={(d) => setEndDate(d, i)}
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="s" />
                <EuiFlexGroup>
                  <EuiFlexItem>
                    <EuiFormRow
                      fullWidth
                      label={i18n.translate(
                        'xpack.ml.revertModelSnapshotFlyout.createCalendar.descriptionLabel',
                        {
                          defaultMessage: 'Description',
                        }
                      )}
                    >
                      <EuiFieldText
                        fullWidth
                        value={c.description}
                        onChange={(e) => setDescription(e.target.value, i)}
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem
                grow={false}
                style={{
                  borderLeft: `1px solid ${euiTheme.euiColorLightShade}`,
                  marginRight: '0px',
                }}
              />
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  style={{ margin: 'auto' }}
                  color={'danger'}
                  onClick={() => removeCalendarEvent(i)}
                  iconType="trash"
                  aria-label={i18n.translate(
                    'xpack.ml.revertModelSnapshotFlyout.createCalendar.deleteLabel',
                    {
                      defaultMessage: 'Delete event',
                    }
                  )}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
          <EuiSpacer size="m" />
        </Fragment>
      ))}
    </>
  );
};

interface ChartProps {
  eventRateData: LineChartPoint[];
  anomalies: Anomaly[];
  loading: boolean;
  onBrushEnd(area: XYBrushEvent): void;
  overlayRanges: Array<{ start: number; end: number }>;
  overlayColor: string;
}

const Chart: FC<ChartProps> = memo(
  ({ eventRateData, anomalies, loading, onBrushEnd, overlayRanges, overlayColor }) => (
    <EventRateChart
      eventRateChartData={eventRateData}
      anomalyData={anomalies}
      loading={loading}
      height={'100px'}
      width={'100%'}
      fadeChart={true}
      overlayRanges={overlayRanges.map((c) => ({
        start: c.start,
        end: c.end,
        color: overlayColor,
        showMarker: false,
      }))}
      onBrushEnd={onBrushEnd as BrushEndListener}
    />
  ),
  (prev: ChartProps, next: ChartProps) => {
    // only redraw if the calendar ranges have changes
    return (
      prev.overlayRanges.length === next.overlayRanges.length &&
      JSON.stringify(prev.overlayRanges) === JSON.stringify(next.overlayRanges)
    );
  }
);

function filterIncompleteEvents(event: CalendarEvent): event is CalendarEvent {
  return event.start !== null && event.end !== null;
}

function createDefaultEventDescription(index: number) {
  return i18n.translate(
    'xpack.ml.revertModelSnapshotFlyout.createCalendar.defaultEventDescription',
    {
      defaultMessage: 'Auto created event {index}',
      values: { index },
    }
  );
}
