/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiDatePicker,
  EuiDatePickerRange,
  // @ts-ignore
  EuiHeaderLogo,
  EuiHorizontalRule,
  EuiPanel,
  // @ts-ignore
  EuiSearchBar,
} from '@elastic/eui';
import { first, last, noop, range as fpRange } from 'lodash/fp';
import moment, { Moment } from 'moment';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import SplitPane from 'react-split-pane';
import { PageContainer, PageContent, PageHeader } from '../../components/page';
import { Footer } from '../../components/page/footer';
import { Navigation } from '../../components/page/navigation';
import { Timeline } from '../../components/timeline';
import { headers } from '../../components/timeline/body/column_headers/headers';
import { getDateRange } from '../../components/timeline/body/mini_map/date_ranges';
import { Sort } from '../../components/timeline/body/sort';
import { mockDataProviders } from '../../components/timeline/data_providers/mock/mock_data_providers';
import {
  OnColumnSorted,
  OnDataProviderRemoved,
  OnFilterChange,
  OnRangeSelected,
} from '../../components/timeline/events';
import { WhoAmI } from '../../containers/who_am_i';

const onColumnSorted: OnColumnSorted = sorted => {
  alert(`column sorted: ${JSON.stringify(sorted)}`);
};

const onDataProviderRemoved: OnDataProviderRemoved = dataProvider => {
  alert(`data provider removed: ${JSON.stringify(dataProvider)}`);
};

const onRangeSelected: OnRangeSelected = range => {
  alert(`range selected: ${range}`);
};

const onFilterChange: OnFilterChange = filter => {
  alert(`filter changed: ${JSON.stringify(filter)}`);
};

const sort: Sort = {
  columnId: 'time',
  sortDirection: 'descending',
};

const VisualizationPlaceholder = styled(EuiPanel)`
  && {
    align-items: center;
    justify-content: center;
    display: flex;
    flex-direction: column;
    margin: 5px;
    padding: 5px 5px 5px 10px;
    width: 500px;
    height: 309px;
  }
`;

const maxTimelineWidth = 1125;

const dates: Date[] = getDateRange('day');
const startDate: Moment = moment(first(dates));
const endDate: Moment = moment(last(dates));

const DatePicker: React.SFC = () => (
  <EuiDatePickerRange
    startDateControl={
      <EuiDatePicker
        selected={startDate}
        onChange={noop}
        isInvalid={false}
        aria-label="Start date"
        showTimeSelect
      />
    }
    endDateControl={
      <EuiDatePicker
        selected={endDate}
        onChange={noop}
        isInvalid={false}
        aria-label="End date"
        showTimeSelect
      />
    }
  />
);

export const HomePage = pure(() => (
  <PageContainer data-test-subj="pageContainer">
    <PageHeader data-test-subj="pageHeader">
      <Navigation data-test-subj="navigation" />
    </PageHeader>
    <PageContent data-test-subj="pageContent">
      <div
        data-test-subj="subHeader"
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
        }}
      >
        <div
          data-test-subj="datePickerContainer"
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            margin: '5px 0 5px 0',
          }}
        >
          <DatePicker />
        </div>
        <EuiHorizontalRule margin="none" />
      </div>

      <SplitPane
        split="vertical"
        defaultSize="75%"
        primary="second"
        pane1Style={{
          height: '100%',
        }}
        pane2Style={{
          height: '100%',
          maxWidth: `${maxTimelineWidth}px`,
        }}
        resizerStyle={{
          border: '5px solid #909AA1',
          backgroundClip: 'padding-box',
          cursor: 'col-resize',
          margin: '5px',
          zIndex: 1,
        }}
      >
        <div
          data-test-subj="pane1"
          style={{
            height: '100%',
            overflow: 'hidden',
          }}
        >
          <div
            data-test-subj="pane1Header"
            style={{
              display: 'flex',
              margin: '5px',
              padding: '5px',
            }}
          >
            <EuiSearchBar />
          </div>
          <div
            data-test-subj="pane1ScrollContainer"
            style={{
              height: '100%',
              overflowY: 'scroll',
            }}
          >
            <div
              data-test-subj="pane1Content"
              style={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'wrap',
                padding: '5px',
                height: '100%',
              }}
            >
              {fpRange(0, 10).map(p => (
                <VisualizationPlaceholder
                  data-test-subj="visualizationPlaceholder"
                  key={`visualizationPlaceholder-${p}`}
                >
                  <WhoAmI sourceId="default">{({ appName }) => <div>{appName}</div>}</WhoAmI>
                </VisualizationPlaceholder>
              ))}
            </div>
          </div>
        </div>

        <div
          data-test-subj="pane2"
          style={{
            height: '100%',
            overflow: 'hidden',
          }}
        >
          <div data-test-subj="pane2Header" />
          <div
            data-test-subj="pane2ScrollContainer"
            style={{
              height: '100%',
              overflowY: 'scroll',
            }}
          >
            <div data-test-subj="pane2Content">
              <Timeline
                columnHeaders={headers}
                dataProviders={mockDataProviders}
                onColumnSorted={onColumnSorted}
                onDataProviderRemoved={onDataProviderRemoved}
                onFilterChange={onFilterChange}
                onRangeSelected={onRangeSelected}
                sort={sort}
                width={maxTimelineWidth}
              />
            </div>
          </div>
        </div>
      </SplitPane>
    </PageContent>
    <Footer />
  </PageContainer>
));
