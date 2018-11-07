/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiHorizontalRule,
  // @ts-ignore
  EuiSearchBar,
} from '@elastic/eui';
import { noop } from 'lodash/fp';
import * as React from 'react';
import { pure } from 'recompose';

import SplitPane from 'react-split-pane';
import {
  PageContainer,
  PageContent,
  PageHeader,
  Pane1,
  Pane1FlexContent,
  Pane1Header,
  Pane1Style,
  Pane2,
  Pane2Style,
  PaneScrollContainer,
  ResizerStyle,
  SubHeader,
  SubHeaderDatePicker,
} from '../../components/page';
import { DatePicker } from '../../components/page/date_picker';
import { Footer } from '../../components/page/footer';
import { Navigation } from '../../components/page/navigation';
import { Timeline } from '../../components/timeline';
import { headers } from '../../components/timeline/body/column_headers/headers';
import { Sort } from '../../components/timeline/body/sort';
import { mockDataProviders } from '../../components/timeline/data_providers/mock/mock_data_providers';
import { ECS } from '../../components/timeline/ecs';
import {
  OnColumnSorted,
  OnDataProviderRemoved,
  OnFilterChange,
  OnRangeSelected,
} from '../../components/timeline/events';

import { mockECSData } from '../mock/mock_ecs';
import { Placeholders } from './visualization_placeholder';

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

export interface EventRenderer {
  isInstance: (data: ECS) => boolean;
  renderMultiClolumn: (data: ECS) => React.ReactNode;
  renderColumn: (columnName: string, data: ECS) => React.ReactNode;
}

const sort: Sort = {
  columnId: 'time',
  sortDirection: 'descending',
};

const maxTimelineWidth = 1125;

export const HomePage = pure(() => (
  <PageContainer data-test-subj="pageContainer">
    <PageHeader data-test-subj="pageHeader">
      <Navigation data-test-subj="navigation" />
    </PageHeader>
    <PageContent data-test-subj="pageContent">
      <SubHeader data-test-subj="subHeader">
        <SubHeaderDatePicker data-test-subj="datePickerContainer">
          <DatePicker />
        </SubHeaderDatePicker>
        <EuiHorizontalRule margin="none" />
      </SubHeader>

      <SplitPane
        data-test-subj="splitPane"
        split="vertical"
        defaultSize="75%"
        primary="second"
        pane1Style={Pane1Style}
        pane2Style={{
          ...Pane2Style,
          maxWidth: `${maxTimelineWidth}px`,
        }}
        resizerStyle={ResizerStyle}
      >
        <Pane1 data-test-subj="pane1">
          <Pane1Header data-test-subj="pane1Header">
            <EuiSearchBar onChange={noop} />
          </Pane1Header>
          <PaneScrollContainer data-test-subj="pane1ScrollContainer">
            <Pane1FlexContent data-test-subj="pane1FlexContent">
              <Placeholders count={10} />
            </Pane1FlexContent>
          </PaneScrollContainer>
        </Pane1>

        <Pane2 data-test-subj="pane2">
          <PaneScrollContainer data-test-subj="pane2ScrollContainer">
            <Timeline
              columnHeaders={headers}
              dataProviders={mockDataProviders}
              data={mockECSData}
              onColumnSorted={onColumnSorted}
              onDataProviderRemoved={onDataProviderRemoved}
              onFilterChange={onFilterChange}
              onRangeSelected={onRangeSelected}
              sort={sort}
              width={maxTimelineWidth}
            />
          </PaneScrollContainer>
        </Pane2>
      </SplitPane>
    </PageContent>
    <Footer />
  </PageContainer>
));
