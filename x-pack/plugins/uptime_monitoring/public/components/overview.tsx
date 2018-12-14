/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiHeader,
  // @ts-ignore missing typings
  EuiHeaderLogo,
  EuiHeaderSection,
  // @ts-ignore missing typings
  EuiHeaderSectionItem,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiSpacer,
} from '@elastic/eui';
import moment from 'moment';
import React from 'react';
import { MonitorList } from './queries/monitor_list';
import { Pings } from './queries/ping_list';
import { Snapshot } from './queries/snapshot';
import { DateSelection, UMDateRangePicker } from './utility/date_range';

interface UptimeOverviewProps {
  dateRangeStart?: Date;
  dateRangeEnd?: Date;
}

interface UptimeOverviewState {
  dateRange: DateSelection;
  start: Date;
  end: Date;
}

const getDatesForRange = (range: DateSelection) => {
  if (range.kind === 'relative') {
    const end = moment().toDate();
    const start = moment(end)
      // @ts-ignore TODO fix typing
      .subtract(range.relativeSpanValue, range.relativeSpanUnit)
      .toDate();
    return {
      start,
      end,
    };
  }
  return {
    start: range.absoluteStart,
    end: range.absoluteEnd,
  };
};

export class UptimeOverview extends React.Component<UptimeOverviewProps, UptimeOverviewState> {
  constructor(props: UptimeOverviewProps) {
    super(props);

    this.state = {
      dateRange: {
        kind: 'absolute',
        relativeSpanValue: 7,
        relativeSpanUnit: 'd',
        absoluteStart:
          props.dateRangeStart ||
          moment()
            .subtract(7, 'd')
            .toDate(),
        absoluteEnd: props.dateRangeEnd || moment().toDate(),
      },
      start: moment()
        .subtract(7, 'd')
        .toDate(),
      end: moment().toDate(),
    };
  }

  public render() {
    const { start, end } = getDatesForRange(this.state.dateRange);
    const rangeStart = moment(start).valueOf();
    const rangeEnd = moment(end).valueOf();
    return (
      <EuiPage className="app-wrapper-panel">
        <EuiHeader>
          <EuiHeaderSection>
            <EuiHeaderSectionItem border="right">
              <EuiHeaderLogo
                aria-label="Go to Uptime Monitoring home page"
                href="#/home"
                iconType="heartbeatApp"
                iconTitle="Uptime Monitoring"
              >
                Uptime Monitoring
              </EuiHeaderLogo>
            </EuiHeaderSectionItem>
            <EuiHeaderSectionItem style={{ paddingTop: '15px' }}>
              <UMDateRangePicker
                selection={this.state.dateRange}
                updateDateRange={this.updateDateRange}
              />
            </EuiHeaderSectionItem>
          </EuiHeaderSection>
        </EuiHeader>
        <EuiPageBody>
          <EuiPageContent>
            <EuiPageContentBody>
              <Snapshot start={rangeStart} end={rangeEnd} />
              <EuiSpacer size="xl" />
              <MonitorList start={rangeStart} end={rangeEnd} />
              <EuiSpacer size="xl" />
              <Pings />
            </EuiPageContentBody>
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }

  private updateDateRange = (
    kind: 'relative' | 'absolute',
    relative?: { value: number; unit: string },
    absolute?: { start: Date; end: Date }
  ) => {
    if (kind === 'relative' && relative) {
      this.setState({
        dateRange: {
          ...this.state.dateRange,
          kind,
          relativeSpanUnit: relative.unit,
          relativeSpanValue: relative.value,
        },
      });
    } else if (kind === 'absolute' && absolute) {
      this.setState({
        dateRange: {
          ...this.state.dateRange,
          kind,
          absoluteStart: absolute.start,
          absoluteEnd: absolute.end,
        },
      });
    }
    // const { start, end } = getDatesForRange(this.state.dateRange);
    // console.log(`the new start is ${start.toString()}`);
    // this.setState({ start, end });
  };
}
