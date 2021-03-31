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

import { EnginesLogic } from './engines_logic';
import { EnginesTable } from './engines_table';

describe('EnginesTable', () => {
  const onChange = jest.fn();
  const onDeleteEngine = jest.fn();

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
    onDeleteEngine,
  };

  const resetMocks = () => {
    jest.clearAllMocks();
    setMockValues({
      myRole: {
        canManageEngines: false,
      },
    });
  };

  describe('basic table', () => {
    let wrapper: ReactWrapper<any>;
    let table: ReactWrapper<any>;

    beforeAll(() => {
      resetMocks();
      wrapper = mountWithIntl(<EnginesTable {...props} />);
      table = wrapper.find(EuiBasicTable);
    });

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
      resetMocks();
      const wrapper = mountWithIntl(<EnginesTable {...props} loading />);

      expect(wrapper.find(EuiBasicTable).prop('loading')).toEqual(true);
    });
  });

  describe('noItemsMessage', () => {
    it('passes the noItemsMessage prop', () => {
      resetMocks();
      const wrapper = mountWithIntl(<EnginesTable {...props} noItemsMessage={'No items.'} />);
      expect(wrapper.find(EuiBasicTable).prop('noItemsMessage')).toEqual('No items.');
    });
  });

  describe('language field', () => {
    beforeAll(() => {
      resetMocks();
    });

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

  describe('actions', () => {
    it('will hide the action buttons if the user cannot manage/delete engines', () => {
      resetMocks();
      const wrapper = shallow(<EnginesTable {...props} />);
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
          myRole: {
            canManageEngines: true,
          },
        });

        wrapper = mountWithIntl(<EnginesTable {...props} />);
        tableRow = wrapper.find(EuiTableRow).first();
        actions = tableRow.find(EuiIcon);
        EnginesLogic.mount();
      });

      it('renders a manage action', () => {
        jest.spyOn(TelemetryLogic.actions, 'sendAppSearchTelemetry');
        jest.spyOn(KibanaLogic.values, 'navigateToUrl');
        actions.at(0).simulate('click');

        expect(TelemetryLogic.actions.sendAppSearchTelemetry).toHaveBeenCalled();
        expect(KibanaLogic.values.navigateToUrl).toHaveBeenCalledWith('/engines/test-engine');
      });

      describe('delete action', () => {
        it('shows the user a confirm message when the action is clicked', () => {
          jest.spyOn(global, 'confirm' as any).mockReturnValueOnce(true);
          actions.at(1).simulate('click');
          expect(global.confirm).toHaveBeenCalled();
        });

        it('clicking the action and confirming deletes the engine', () => {
          jest.spyOn(global, 'confirm' as any).mockReturnValueOnce(true);
          jest.spyOn(EnginesLogic.actions, 'deleteEngine');

          actions.at(1).simulate('click');

          expect(onDeleteEngine).toHaveBeenCalled();
        });

        it('clicking the action and not confirming does not delete the engine', () => {
          jest.spyOn(global, 'confirm' as any).mockReturnValueOnce(false);
          jest.spyOn(EnginesLogic.actions, 'deleteEngine');

          actions.at(1).simulate('click');

          expect(onDeleteEngine).toHaveBeenCalledTimes(0);
        });
      });
    });
  });
});
