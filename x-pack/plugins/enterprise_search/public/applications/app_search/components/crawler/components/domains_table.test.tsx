/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockKibanaValues, setMockActions, setMockValues } from '../../../../__mocks__/kea_logic';
import '../../../__mocks__/engine_logic.mock';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiBasicTable, EuiButtonIcon } from '@elastic/eui';

import { DEFAULT_META } from '../../../../shared/constants';
import { mountWithIntl } from '../../../../test_helpers';

import { CrawlerDomain } from '../types';

import { DomainsTable } from './domains_table';

const domains: CrawlerDomain[] = [
  {
    id: '1234',
    documentCount: 9999,
    url: 'elastic.co',
    crawlRules: [],
    entryPoints: [],
    sitemaps: [],
    lastCrawl: '2020-01-01T00:00:00-12:00',
    createdOn: '2020-01-01T00:00:00-12:00',
    deduplicationEnabled: false,
    deduplicationFields: ['title'],
    availableDeduplicationFields: ['title', 'description'],
  },
  {
    id: '4567',
    documentCount: 0,
    url: 'empty.site',
    crawlRules: [],
    entryPoints: [],
    sitemaps: [],
    createdOn: '1970-01-01T00:00:00-12:00',
    deduplicationEnabled: false,
    deduplicationFields: ['title'],
    availableDeduplicationFields: ['title', 'description'],
  },
];

const values = {
  // EngineLogic
  engineName: 'some-engine',
  // CrawlerDomainsLogic
  domains,
  meta: DEFAULT_META,
  dataLoading: false,
  // AppLogic
  myRole: { canManageEngineCrawler: false },
};

const actions = {
  // CrawlerDomainsLogic
  deleteDomain: jest.fn(),
  fetchCrawlerDomainsData: jest.fn(),
  onPaginate: jest.fn(),
};

describe('DomainsTable', () => {
  let wrapper: ShallowWrapper;
  let tableContent: string;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(() => {
    setMockValues(values);
    setMockActions(actions);
    wrapper = shallow(<DomainsTable />);
    tableContent = mountWithIntl(<DomainsTable />)
      .find(EuiBasicTable)
      .text();
  });

  it('renders', () => {
    expect(wrapper.find(EuiBasicTable)).toHaveLength(1);

    expect(wrapper.find(EuiBasicTable).prop('pagination')).toEqual({
      showPerPageOptions: false,
      pageIndex: 0,
      pageSize: 10,
      totalItemCount: 0,
    });

    wrapper.find(EuiBasicTable).simulate('change', { page: { index: 2 } });
    expect(actions.onPaginate).toHaveBeenCalledWith(3);
  });

  describe('columns', () => {
    it('renders a url column', () => {
      expect(tableContent).toContain('elastic.co');
    });

    it('renders a clickable domain url', () => {
      const basicTable = wrapper.find(EuiBasicTable).dive();
      const link = basicTable.find('[data-test-subj="CrawlerDomainURL"]').at(0);

      expect(link.dive().text()).toContain('elastic.co');
      expect(link.props()).toEqual(
        expect.objectContaining({
          to: '/engines/some-engine/crawler/domains/1234',
        })
      );
    });

    it('renders a last crawled column', () => {
      expect(tableContent).toContain('Last activity');
      expect(tableContent).toContain('Jan 1, 2020');
    });

    it('renders a document count column', () => {
      expect(tableContent).toContain('Documents');
      expect(tableContent).toContain('9,999');
    });

    describe('actions column', () => {
      const getTable = () => wrapper.find(EuiBasicTable).dive();
      const getActions = () => getTable().find('ExpandedItemActions');
      const getActionItems = () => getActions().first().dive().find('DefaultItemAction');

      it('will hide the action buttons if the user cannot manage/delete engines', () => {
        setMockValues({
          ...values,
          // AppLogic
          myRole: { canManageEngineCrawler: false },
        });
        wrapper = shallow(<DomainsTable />);

        expect(getActions()).toHaveLength(0);
      });

      describe('when the user can manage/delete engines', () => {
        const getManageAction = () => getActionItems().at(0).dive().find(EuiButtonIcon);
        const getDeleteAction = () => getActionItems().at(1).dive().find(EuiButtonIcon);

        beforeEach(() => {
          setMockValues({
            ...values,
            // AppLogic
            myRole: { canManageEngineCrawler: true },
          });
          wrapper = shallow(<DomainsTable />);
        });

        describe('manage action', () => {
          it('sends the user to the engine overview on click', () => {
            const { navigateToUrl } = mockKibanaValues;

            getManageAction().simulate('click');

            expect(navigateToUrl).toHaveBeenCalledWith('/engines/some-engine/crawler/domains/1234');
          });
        });

        describe('delete action', () => {
          it('clicking the action and confirming deletes the domain', () => {
            jest.spyOn(global, 'confirm').mockReturnValueOnce(true);

            getDeleteAction().simulate('click');

            expect(actions.deleteDomain).toHaveBeenCalledWith(
              expect.objectContaining({ id: '1234' })
            );
          });

          it('clicking the action and not confirming does not delete the engine', () => {
            jest.spyOn(global, 'confirm').mockReturnValueOnce(false);

            getDeleteAction().simulate('click');

            expect(actions.deleteDomain).not.toHaveBeenCalled();
          });
        });
      });
    });
  });
});
