/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/enterprise_search_url.mock';
import { mockTelemetryActions, mountWithIntl, setMockValues } from '../../../__mocks__';

import React from 'react';

import { ReactWrapper, shallow } from 'enzyme';

import { EuiBasicTable, EuiPagination, EuiButtonEmpty, EuiIcon, EuiTableRow } from '@elastic/eui';

import { KibanaLogic } from '../../../shared/kibana';
import { EuiLinkTo } from '../../../shared/react_router_helpers';

import { TelemetryLogic } from '../../../shared/telemetry';
import { EngineDetails } from '../engine/types';

import { MetaEnginesTableExpandedRow } from './components/meta_engines_table_expanded_row';
import { MetaEnginesTableNameColumnContent } from './components/meta_engines_table_name_column_content';
import { EnginesLogic } from './engines_logic';
import { MetaEnginesTable } from './meta_engines_table';

describe('MetaEnginesTable', () => {
  const onChange = jest.fn();
  const onDeleteEngine = jest.fn();

  const data = [
    {
      name: 'test-engine',
      created_at: 'Fri, 1 Jan 1970 12:00:00 +0000',
      language: 'English',
      isMeta: true,
      document_count: 99999,
      field_count: 10,
      includedEngines: [
        {
          name: 'source-engine-1',
        },
        { name: 'source-engine-2' },
      ],
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
    onDeleteEngine,
  };

  const DEFAULT_VALUES = {
    myRole: {
      canManageMetaEngines: false,
    },
    expandedSourceEngines: {},
    conflictingEnginesSets: {},
    hideRow: jest.fn(),
    fetchOrDisplayRow: jest.fn(),
  };

  const resetMocks = () => {
    jest.clearAllMocks();
    setMockValues(DEFAULT_VALUES);
  };

  describe('basic table', () => {
    let wrapper: ReactWrapper<any>;
    let table: ReactWrapper<any>;

    beforeAll(() => {
      resetMocks();
      wrapper = mountWithIntl(<MetaEnginesTable {...props} />);
      table = wrapper.find(EuiBasicTable);
    });

    it('renders', () => {
      expect(table).toHaveLength(1);
      expect(table.prop('pagination').totalItemCount).toEqual(50);
      expect(table.find(MetaEnginesTableNameColumnContent)).toHaveLength(1);

      const tableContent = table.text();
      expect(tableContent).toContain('Jan 1, 1970');
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
      resetMocks();
      const wrapper = mountWithIntl(<MetaEnginesTable {...props} loading />);

      expect(wrapper.find(EuiBasicTable).prop('loading')).toEqual(true);
    });
  });

  describe('noItemsMessage', () => {
    it('passes the noItemsMessage prop', () => {
      resetMocks();
      const wrapper = mountWithIntl(<MetaEnginesTable {...props} noItemsMessage={'No items.'} />);
      expect(wrapper.find(EuiBasicTable).prop('noItemsMessage')).toEqual('No items.');
    });
  });

  describe('actions', () => {
    it('will hide the action buttons if the user cannot manage/delete engines', () => {
      resetMocks();
      const wrapper = shallow(<MetaEnginesTable {...props} />);
      const tableRow = wrapper.find(EuiTableRow).first();

      expect(tableRow.find(EuiIcon)).toHaveLength(0);
    });

    describe('when the user can manage/delete engines', () => {
      let wrapper: ReactWrapper<any>;
      let tableRow: ReactWrapper<any>;
      let actions: ReactWrapper<any>;

      beforeEach(() => {
        resetMocks();
        setMockValues({
          ...DEFAULT_VALUES,
          myRole: {
            canManageMetaEngines: true,
          },
        });

        wrapper = mountWithIntl(<MetaEnginesTable {...props} />);
        tableRow = wrapper.find(EuiTableRow).first();
        actions = tableRow.find(EuiIcon);
        EnginesLogic.mount();
      });

      it('renders a manage action', () => {
        jest.spyOn(TelemetryLogic.actions, 'sendAppSearchTelemetry');
        jest.spyOn(KibanaLogic.values, 'navigateToUrl');
        actions.at(1).simulate('click');

        expect(TelemetryLogic.actions.sendAppSearchTelemetry).toHaveBeenCalled();
        expect(KibanaLogic.values.navigateToUrl).toHaveBeenCalledWith('/engines/test-engine');
      });

      describe('delete action', () => {
        it('shows the user a confirm message when the action is clicked', () => {
          jest.spyOn(global, 'confirm' as any).mockReturnValueOnce(true);
          actions.at(2).simulate('click');
          expect(global.confirm).toHaveBeenCalled();
        });

        it('clicking the action and confirming deletes the engine', () => {
          jest.spyOn(global, 'confirm' as any).mockReturnValueOnce(true);
          jest.spyOn(EnginesLogic.actions, 'deleteEngine');

          actions.at(2).simulate('click');

          expect(onDeleteEngine).toHaveBeenCalled();
        });

        it('clicking the action and not confirming does not delete the engine', () => {
          jest.spyOn(global, 'confirm' as any).mockReturnValueOnce(false);
          jest.spyOn(EnginesLogic.actions, 'deleteEngine');

          actions.at(2).simulate('click');

          expect(onDeleteEngine).toHaveBeenCalledTimes(0);
        });
      });
    });
  });

  describe('source engines', () => {
    describe('source engine table', () => {
      beforeEach(() => {
        resetMocks();
      });

      it('is hidden by default', () => {
        const wrapper = shallow(<MetaEnginesTable {...props} />);
        const table = wrapper.find(EuiBasicTable);
        expect(table.dive().find(MetaEnginesTableExpandedRow)).toHaveLength(0);
      });

      it('is visible when the row has been expanded', () => {
        setMockValues({
          ...DEFAULT_VALUES,
          expandedSourceEngines: { 'test-engine': true },
        });
        const wrapper = shallow(<MetaEnginesTable {...props} />);
        const table = wrapper.find(EuiBasicTable);
        expect(table.dive().find(MetaEnginesTableExpandedRow)).toHaveLength(1);
      });
    });
  });
});
