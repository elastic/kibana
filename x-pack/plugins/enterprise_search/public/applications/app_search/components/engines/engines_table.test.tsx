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

  const data = [
    {
      name: 'test-engine',
      created_at: 'Fri, 1 Jan 1970 12:00:00 +0000',
      language: 'English',
      isMeta: false,
      document_count: 99999,
      field_count: 10,
    },
  ];
  const pagination = {
    totalEngines: 50,
    pageIndex: 0,
    onPaginate,
  };
  const props = {
    data,
    pagination,
  };

  const wrapper = mountWithIntl(<EnginesTable {...props} />);
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

  describe('language field', () => {
    it('renders language when available', () => {
      const wrapperWithLanguage = mountWithIntl(
        <EnginesTable
          data={[
            {
              ...data[0],
              language: 'German',
              isMeta: false,
            },
          ]}
          pagination={pagination}
        />
      );
      const tableContent = wrapperWithLanguage.find(EuiBasicTable).text();
      expect(tableContent).toContain('German');
    });

    it('renders the language as Universal if no language is set', () => {
      const wrapperWithLanguage = mountWithIntl(
        <EnginesTable
          data={[
            {
              ...data[0],
              language: null,
              isMeta: false,
            },
          ]}
          pagination={pagination}
        />
      );
      const tableContent = wrapperWithLanguage.find(EuiBasicTable).text();
      expect(tableContent).toContain('Universal');
    });

    it('renders no language text if the engine is a Meta Engine', () => {
      const wrapperWithLanguage = mountWithIntl(
        <EnginesTable
          data={[
            {
              ...data[0],
              language: null,
              isMeta: true,
            },
          ]}
          pagination={pagination}
        />
      );
      const tableContent = wrapperWithLanguage.find(EuiBasicTable).text();
      expect(tableContent).not.toContain('Universal');
    });
  });
});
