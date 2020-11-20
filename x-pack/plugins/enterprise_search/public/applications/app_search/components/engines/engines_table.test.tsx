/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../__mocks__/kea.mock';
import '../../../__mocks__/enterprise_search_url.mock';
import { mockTelemetryActions, mountWithIntl } from '../../../__mocks__/';

import React from 'react';
import { EuiBasicTable, EuiPagination, EuiButtonEmpty } from '@elastic/eui';
import { EuiLinkTo } from '../../../shared/react_router_helpers';

import { EnginesTable } from './engines_table';

describe('EnginesTable', () => {
  const onPaginate = jest.fn(); // onPaginate updates the engines API call upstream

  const wrapper = mountWithIntl(
    <EnginesTable
      data={[
        {
          name: 'test-engine',
          created_at: 'Fri, 1 Jan 1970 12:00:00 +0000',
          language: 'English',
          document_count: 99999,
          field_count: 10,
        },
      ]}
      pagination={{
        totalEngines: 50,
        pageIndex: 0,
        onPaginate,
      }}
    />
  );
  const table = wrapper.find(EuiBasicTable);

  it('renders', () => {
    expect(table).toHaveLength(1);
    expect(table.prop('pagination').totalItemCount).toEqual(50);

    const tableContent = table.text();
    expect(tableContent).toContain('test-engine');
    expect(tableContent).toContain('Jan 1, 1970');
    expect(tableContent).toContain('English');
    expect(tableContent).toContain('99,999');
    expect(tableContent).toContain('10');

    expect(table.find(EuiPagination).find(EuiButtonEmpty)).toHaveLength(5); // Should display 5 pages at 10 engines per page
  });

  it('contains engine links which send telemetry', () => {
    const engineLinks = wrapper.find(EuiLinkTo);

    engineLinks.forEach((link) => {
      expect(link.prop('to')).toEqual('/engines/test-engine');
      link.simulate('click');

      expect(mockTelemetryActions.sendAppSearchTelemetry).toHaveBeenCalledWith({
        action: 'clicked',
        metric: 'engine_table_link',
      });
    });
  });

  it('triggers onPaginate', () => {
    table.prop('onChange')({ page: { index: 4 } });

    expect(onPaginate).toHaveBeenCalledWith(5);
  });

  it('handles empty data', () => {
    const emptyWrapper = mountWithIntl(
      <EnginesTable
        data={[]}
        pagination={{ totalEngines: 0, pageIndex: 0, onPaginate: () => {} }}
      />
    );
    const emptyTable = emptyWrapper.find(EuiBasicTable);

    expect(emptyTable.prop('pagination').pageIndex).toEqual(0);
  });
});
