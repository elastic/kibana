/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/enterprise_search_url.mock';
import { mockTelemetryActions, mountWithIntl } from '../../../__mocks__';

import React from 'react';

import { EuiBasicTable, EuiPagination, EuiButtonEmpty } from '@elastic/eui';

import { EuiLinkTo } from '../../../shared/react_router_helpers';

import { EngineDetails } from '../engine/types';

import { EnginesTable } from './engines_table';

describe('EnginesTable', () => {
  const onChange = jest.fn();
  const data = [
    {
      name: 'test-engine',
      created_at: 'Fri, 1 Jan 1970 12:00:00 +0000',
      language: 'English',
      isMeta: false,
      document_count: 99999,
      field_count: 10,
    } as EngineDetails,
  ];
  const pagination = {
    pageIndex: 0,
    pageSize: 10,
    totalItemCount: 50,
    hidePerPageOptions: true,
  };
  const props = {
    items: data,
    loading: false,
    pagination,
    onChange,
  };

  describe('basic table', () => {
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
      expect(onChange).toHaveBeenCalledWith({ page: { index: 4 } });
    });
  });

  describe('loading', () => {
    it('passes the loading prop', () => {
      const wrapper = mountWithIntl(<EnginesTable {...props} loading />);
      expect(wrapper.find(EuiBasicTable).prop('loading')).toEqual(true);
    });
  });

  describe('language field', () => {
    it('renders language when available', () => {
      const wrapper = mountWithIntl(
        <EnginesTable
          {...props}
          items={[
            {
              ...data[0],
              language: 'German',
              isMeta: false,
            },
          ]}
        />
      );
      const tableContent = wrapper.find(EuiBasicTable).text();
      expect(tableContent).toContain('German');
    });

    it('renders the language as Universal if no language is set', () => {
      const wrapper = mountWithIntl(
        <EnginesTable
          {...props}
          items={[
            {
              ...data[0],
              language: null,
              isMeta: false,
            },
          ]}
        />
      );
      const tableContent = wrapper.find(EuiBasicTable).text();
      expect(tableContent).toContain('Universal');
    });

    it('renders no language text if the engine is a Meta Engine', () => {
      const wrapper = mountWithIntl(
        <EnginesTable
          {...props}
          items={[
            {
              ...data[0],
              language: null,
              isMeta: true,
            },
          ]}
        />
      );
      const tableContent = wrapper.find(EuiBasicTable).text();
      expect(tableContent).not.toContain('Universal');
    });
  });
});
