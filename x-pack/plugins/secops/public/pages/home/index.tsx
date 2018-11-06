/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  // @ts-ignore
  EuiHeaderLogo,
  EuiHealth,
  EuiHorizontalRule,
  EuiPanel,
} from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import SplitPane from 'react-split-pane';
import { PageContainer, PageContent, PageHeader } from '../../components/page';
import { Footer } from '../../components/page/footer';
import { Navigation } from '../../components/page/navigation';
import { Timeline } from '../../components/timeline';
import { headers } from '../../components/timeline/body/column_headers/headers';
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

export const HomePage = pure(() => (
  <PageContainer data-test-subj="pageContainer">
    <PageHeader data-test-subj="pageHeader">
      <Navigation data-test-subj="navigation" />
    </PageHeader>
    <PageContent data-test-subj="pageContent">
      <SplitPane
        split="vertical"
        defaultSize="75%"
        primary="second"
        resizerStyle={{
          background: '#000',
          border: '5px solid',
          opacity: 0.8,
          zIndex: 1,
          boxSizing: 'border-box',
          backgroundClip: 'padding-box',
          cursor: 'col-resize',
        }}
        pane1Style={{
          overflowY: 'scroll',
        }}
        pane2Style={{
          maxWidth: `${maxTimelineWidth}px`,
          overflowY: 'scroll',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            overflow: 'scroll',
          }}
        >
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(x => (
            <VisualizationPlaceholder data-test-subj="visualizationPlaceholder" key={x}>
              <WhoAmI sourceId="default">{({ appName }) => <h1>{appName}</h1>}</WhoAmI>
            </VisualizationPlaceholder>
          ))}
        </div>
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
      </SplitPane>
    </PageContent>
    <Footer>
      <EuiHorizontalRule margin="xs" />
      <WhoAmI sourceId="default">
        {({ appName }) => <EuiHealth color="success">Live {appName} data</EuiHealth>}
      </WhoAmI>
    </Footer>
  </PageContainer>
));
