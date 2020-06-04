/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiBasicTable, EuiPagination, EuiButtonEmpty, EuiLink } from '@elastic/eui';

import { mountWithContext } from '../../../__mocks__';
jest.mock('../../../shared/telemetry', () => ({ sendTelemetry: jest.fn() }));
import { sendTelemetry } from '../../../shared/telemetry';

import { EngineTable } from './engine_table';

describe('EngineTable', () => {
  const onPaginate = jest.fn(); // onPaginate updates the engines API call upstream

  const wrapper = mountWithContext(
    <EngineTable
      data={[
        {
          name: 'test-engine',
          created_at: 'Fri, 1 Jan 1970 12:00:00 +0000',
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
    expect(tableContent).toContain('January 1, 1970');
    expect(tableContent).toContain('99,999');
    expect(tableContent).toContain('10');

    expect(table.find(EuiPagination).find(EuiButtonEmpty)).toHaveLength(5); // Should display 5 pages at 10 engines per page
  });

  it('contains engine links which send telemetry', () => {
    const engineLinks = wrapper.find(EuiLink);

    engineLinks.forEach((link) => {
      expect(link.prop('href')).toEqual('http://localhost:3002/as/engines/test-engine');
      link.simulate('click');

      expect(sendTelemetry).toHaveBeenCalledWith({
        http: expect.any(Object),
        product: 'app_search',
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
    const emptyWrapper = mountWithContext(
      <EngineTable data={[]} pagination={{ totalEngines: 0, pageIndex: 0, onPaginate: () => {} }} />
    );
    const emptyTable = emptyWrapper.find(EuiBasicTable);
    expect(emptyTable.prop('pagination').pageIndex).toEqual(0);
  });
});
