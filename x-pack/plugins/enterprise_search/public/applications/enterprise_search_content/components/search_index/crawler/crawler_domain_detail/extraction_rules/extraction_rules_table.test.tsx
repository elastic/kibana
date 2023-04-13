/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockFlashMessageHelpers, setMockActions } from '../../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiFieldText, EuiSelect } from '@elastic/eui';

import { GenericEndpointInlineEditableTable } from '../../../../../../shared/tables/generic_endpoint_inline_editable_table';
import { CrawlerPolicies, CrawlerRules } from '../../../../../api/crawler/types';

import { CrawlRulesTable, CrawlRulesTableProps } from '../crawl_rules_table';

describe('CrawlRulesTable', () => {
  const { clearFlashMessages, flashSuccessToast } = mockFlashMessageHelpers;
  const indexName = 'index-name';
  const crawlRules = [
    { id: '1', pattern: '*', policy: CrawlerPolicies.allow, rule: CrawlerRules.beginsWith },
    { id: '2', pattern: '*', policy: CrawlerPolicies.deny, rule: CrawlerRules.endsWith },
  ];

  const DEFAULT_PROPS: CrawlRulesTableProps = {
    crawlRules,
    domainId: '6113e1407a2f2e6f42489794',
    indexName,
  };
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    const wrapper = shallow(<CrawlRulesTable {...DEFAULT_PROPS} />);

    expect(wrapper.find(GenericEndpointInlineEditableTable).exists()).toBe(true);
  });

  describe('columns', () => {
    const crawlRule = {
      id: '1',
      pattern: '*',
      policy: CrawlerPolicies.allow,
      rule: CrawlerRules.beginsWith,
    };
    let wrapper: ShallowWrapper;

    beforeEach(() => {
      wrapper = shallow(<CrawlRulesTable {...DEFAULT_PROPS} />);
    });

    const renderColumn = (index: number) => {
      const columns = wrapper.find(GenericEndpointInlineEditableTable).prop('columns');
      return shallow(<div>{columns[index].render(crawlRule)}</div>);
    };

    const onChange = jest.fn();
    const renderColumnInEditingMode = (index: number) => {
      const columns = wrapper.find(GenericEndpointInlineEditableTable).prop('columns');
      return shallow(
        <div>
          {columns[index].editingRender(crawlRule, onChange, {
            isInvalid: false,
            isLoading: false,
          })}
        </div>
      );
    };

    describe('policy column', () => {
      it('shows the policy of a crawl rule', () => {
        expect(renderColumn(0).html()).toContain('Allow');
      });

      it('can show the policy of a crawl rule as editable', () => {
        const column = renderColumnInEditingMode(0);

        const selectField = column.find(EuiSelect);
        expect(selectField.props()).toEqual(
          expect.objectContaining({
            disabled: false,
            isInvalid: false,
            options: [
              { text: 'Allow', value: 'allow' },
              { text: 'Disallow', value: 'deny' },
            ],
            value: 'allow',
          })
        );

        selectField.simulate('change', { target: { value: 'deny' } });
        expect(onChange).toHaveBeenCalledWith('deny');
      });
    });

    describe('rule column', () => {
      it('shows the rule of a crawl rule', () => {
        expect(renderColumn(1).html()).toContain('Begins with');
      });

      it('can show the rule of a crawl rule as editable', () => {
        const column = renderColumnInEditingMode(1);

        const selectField = column.find(EuiSelect);
        expect(selectField.props()).toEqual(
          expect.objectContaining({
            disabled: false,
            isInvalid: false,
            options: [
              { text: 'Begins with', value: 'begins' },
              { text: 'Ends with', value: 'ends' },
              { text: 'Contains', value: 'contains' },
              { text: 'Regex', value: 'regex' },
            ],
            value: 'begins',
          })
        );

        selectField.simulate('change', { target: { value: 'ends' } });
        expect(onChange).toHaveBeenCalledWith('ends');
      });
    });

    describe('pattern column', () => {
      it('shows the pattern of a crawl rule', () => {
        expect(renderColumn(2).html()).toContain('*');
      });

      it('can show the pattern of a crawl rule as editable', () => {
        const column = renderColumnInEditingMode(2);

        const field = column.find(EuiFieldText);
        expect(field.props()).toEqual(
          expect.objectContaining({
            disabled: false,
            isInvalid: false,
            value: '*',
          })
        );

        field.simulate('change', { target: { value: 'foo' } });
        expect(onChange).toHaveBeenCalledWith('foo');
      });
    });
  });

  describe('routes', () => {
    it('can calculate an update and delete route correctly', () => {
      const wrapper = shallow(<CrawlRulesTable {...DEFAULT_PROPS} />);

      const table = wrapper.find(GenericEndpointInlineEditableTable);

      const crawlRule = {
        id: '1',
        pattern: '*',
        policy: CrawlerPolicies.allow,
        rule: CrawlerRules.beginsWith,
      };
      expect(table.prop('deleteRoute')(crawlRule)).toEqual(
        '/internal/enterprise_search/indices/index-name/crawler/domains/6113e1407a2f2e6f42489794/crawl_rules/1'
      );
      expect(table.prop('updateRoute')(crawlRule)).toEqual(
        '/internal/enterprise_search/indices/index-name/crawler/domains/6113e1407a2f2e6f42489794/crawl_rules/1'
      );
    });
  });

  it('shows a custom description if one is provided', () => {
    const wrapper = shallow(
      <CrawlRulesTable {...DEFAULT_PROPS} description="I am a description" />
    );

    const table = wrapper.find(GenericEndpointInlineEditableTable);
    expect(table.prop('description')).toEqual('I am a description');
  });

  it('shows a default crawl rule as uneditable if one is provided', () => {
    const wrapper = shallow(
      <CrawlRulesTable
        domainId="6113e1407a2f2e6f42489794"
        indexName={indexName}
        crawlRules={crawlRules}
        defaultCrawlRule={crawlRules[0]}
      />
    );

    const table = wrapper.find(GenericEndpointInlineEditableTable);
    expect(table.prop('uneditableItems')).toEqual([crawlRules[0]]);
  });

  describe('when a crawl rule is added', () => {
    it('should update the crawl rules for the current domain, and clear flash messages', () => {
      const updateCrawlRules = jest.fn();
      setMockActions({
        updateCrawlRules,
      });
      const wrapper = shallow(
        <CrawlRulesTable {...DEFAULT_PROPS} defaultCrawlRule={crawlRules[0]} />
      );
      const table = wrapper.find(GenericEndpointInlineEditableTable);

      const crawlRulesThatWasAdded = {
        id: '2',
        pattern: '*',
        policy: CrawlerPolicies.deny,
        rule: CrawlerRules.endsWith,
      };
      const updatedCrawlRules = [
        { id: '1', pattern: '*', policy: CrawlerPolicies.allow, rule: CrawlerRules.beginsWith },
        { id: '2', pattern: '*', policy: CrawlerPolicies.deny, rule: CrawlerRules.endsWith },
      ];
      table.prop('onAdd')(crawlRulesThatWasAdded, updatedCrawlRules);
      expect(updateCrawlRules).toHaveBeenCalledWith(updatedCrawlRules);
      expect(clearFlashMessages).toHaveBeenCalled();
    });
  });

  describe('when a crawl rule is updated', () => {
    it('should update the crawl rules for the current domain, and clear flash messages', () => {
      const updateCrawlRules = jest.fn();
      setMockActions({
        updateCrawlRules,
      });
      const wrapper = shallow(
        <CrawlRulesTable {...DEFAULT_PROPS} defaultCrawlRule={crawlRules[0]} />
      );
      const table = wrapper.find(GenericEndpointInlineEditableTable);

      const crawlRulesThatWasUpdated = {
        id: '2',
        pattern: '*',
        policy: CrawlerPolicies.deny,
        rule: CrawlerRules.endsWith,
      };
      const updatedCrawlRules = [
        { id: '1', pattern: '*', policy: CrawlerPolicies.allow, rule: CrawlerRules.beginsWith },
        {
          id: '2',
          pattern: 'newPattern',
          policy: CrawlerPolicies.deny,
          rule: CrawlerRules.endsWith,
        },
      ];
      table.prop('onUpdate')(crawlRulesThatWasUpdated, updatedCrawlRules);
      expect(updateCrawlRules).toHaveBeenCalledWith(updatedCrawlRules);
      expect(clearFlashMessages).toHaveBeenCalled();
    });
  });

  describe('when a crawl rule is deleted', () => {
    it('should update the crawl rules for the current domain, clear flash messages, and show a success', () => {
      const updateCrawlRules = jest.fn();
      setMockActions({
        updateCrawlRules,
      });
      const wrapper = shallow(
        <CrawlRulesTable {...DEFAULT_PROPS} defaultCrawlRule={crawlRules[0]} />
      );
      const table = wrapper.find(GenericEndpointInlineEditableTable);

      const crawlRulesThatWasDeleted = {
        id: '2',
        pattern: '*',
        policy: CrawlerPolicies.deny,
        rule: CrawlerRules.endsWith,
      };
      const updatedCrawlRules = [
        { id: '1', pattern: '*', policy: CrawlerPolicies.allow, rule: CrawlerRules.beginsWith },
      ];
      table.prop('onDelete')(crawlRulesThatWasDeleted, updatedCrawlRules);
      expect(updateCrawlRules).toHaveBeenCalledWith(updatedCrawlRules);
      expect(clearFlashMessages).toHaveBeenCalled();
      expect(flashSuccessToast).toHaveBeenCalled();
    });
  });

  describe('when a crawl rule is reordered', () => {
    it('should update the crawl rules for the current domain and clear flash messages', () => {
      const updateCrawlRules = jest.fn();
      setMockActions({
        updateCrawlRules,
      });
      const wrapper = shallow(
        <CrawlRulesTable {...DEFAULT_PROPS} defaultCrawlRule={crawlRules[0]} />
      );
      const table = wrapper.find(GenericEndpointInlineEditableTable);

      const updatedCrawlRules = [
        { id: '2', pattern: '*', policy: CrawlerPolicies.deny, rule: CrawlerRules.endsWith },
        { id: '1', pattern: '*', policy: CrawlerPolicies.allow, rule: CrawlerRules.beginsWith },
      ];
      table.prop('onReorder')!(updatedCrawlRules);
      expect(updateCrawlRules).toHaveBeenCalledWith(updatedCrawlRules);
      expect(clearFlashMessages).toHaveBeenCalled();
    });
  });
});
