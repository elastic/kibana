/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import { pure } from 'recompose';
import styled from 'styled-components';

import { LinkToPage } from '../../components/link_to';
import { PageContainer, PageContent } from '../../components/page';
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

import { NotFoundPage } from '../404';
import { Hosts } from '../hosts';
import { Network } from '../network';
import { Overview } from '../overview';

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

export const HomePage = pure(() => (
  <PageContainer>
    <Navigation />
    <PageContent>
      <Divide>
        <Switch>
          <Redirect from="/" exact={true} to="/overview" />
          <Route path="/overview" component={Overview} />
          <Route path="/hosts" component={Hosts} />
          <Route path="/network" component={Network} />
          <Route path="/link-to" component={LinkToPage} />
          <Route component={NotFoundPage} />
        </Switch>
        <Timeline
          columnHeaders={headers}
          dataProviders={mockDataProviders}
          onColumnSorted={onColumnSorted}
          onDataProviderRemoved={onDataProviderRemoved}
          onFilterChange={onFilterChange}
          onRangeSelected={onRangeSelected}
          sort={sort}
          width={900}
        />
      </Divide>
    </PageContent>
    <Footer>
      <WhoAmI sourceId="default">{({ appName }) => <h1>Hello {appName}</h1>}</WhoAmI>
    </Footer>
  </PageContainer>
));

const Footer = styled.div`
  position: fixed;
  left: 0;
  bottom: 0;
  width: 100%;
  color: #666;
  padding: 8px 8px;
  text-align: center;
`;

const Divide = styled.div`
  display: flex;
  flex-direction: row;
`;
