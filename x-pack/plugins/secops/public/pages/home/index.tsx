/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { pure } from 'recompose';

import { ColumnarPage } from '../../components/page';
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

export const HomePage = pure(() => (
  <ColumnarPage>
    <div
      style={{
        alignItems: 'center',
        display: 'flex',
        flexDirection: 'column',
        marginTop: '10px',
      }}
    >
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
      <WhoAmI sourceId="default">{({ appName }) => <h1>Hello {appName}</h1>}</WhoAmI>
    </div>
  </ColumnarPage>
));
