/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LogicMounter,
  mockFlashMessageHelpers,
  setMockActions,
  setMockValues,
} from '../../../../../__mocks__/kea_logic';
import { fullContentSources } from '../../../../__mocks__/content_sources.mock';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiFieldText, EuiSelect } from '@elastic/eui';

import { InlineEditableTable } from '../../../../../shared/tables/inline_editable_table';

import { SourceLogic } from '../../source_logic';

import { IndexingRulesTable } from './indexing_rules_table';
import { SynchronizationLogic } from './synchronization_logic';

describe('IndexingRulesTable', () => {
  const { clearFlashMessages } = mockFlashMessageHelpers;
  const { mount: sourceMount } = new LogicMounter(SourceLogic);
  const { mount: syncMount } = new LogicMounter(SynchronizationLogic);

  const indexingRules = [
    { id: 0, valueType: 'exclude', filterType: 'path_template', value: 'value' },
    { id: 1, valueType: 'include', filterType: 'file_extension', value: 'value' },
    { id: 2, valueType: 'include', filterType: 'object_type', value: 'value 2' },
    { id: 3, valueType: 'broken', filterType: 'not allowed', value: 'value 2' },
  ];
  const contentSource = fullContentSources[0];

  beforeEach(() => {
    jest.clearAllMocks();
    sourceMount({}, {});
    setMockValues({ contentSource });
    syncMount({}, { contentSource });
  });

  it('renders', () => {
    const wrapper = shallow(<IndexingRulesTable />);

    expect(wrapper.find(InlineEditableTable).exists()).toBe(true);
  });

  describe('columns', () => {
    let wrapper: ShallowWrapper;

    beforeEach(() => {
      wrapper = shallow(<IndexingRulesTable />);
    });

    const renderColumn = (index: number, ruleIndex: number) => {
      const columns = wrapper.find(InlineEditableTable).prop('columns');
      return shallow(<div>{columns[index].render(indexingRules[ruleIndex])}</div>);
    };

    const onChange = jest.fn();
    const renderColumnInEditingMode = (index: number, ruleIndex: number) => {
      const columns = wrapper.find(InlineEditableTable).prop('columns');
      return shallow(
        <div>
          {columns[index].editingRender(indexingRules[ruleIndex], onChange, {
            isInvalid: false,
            isLoading: false,
          })}
        </div>
      );
    };

    describe(' column', () => {
      it('shows the value type of an indexing rule', () => {
        expect(renderColumn(0, 0).html()).toContain('Exclude');
        expect(renderColumn(0, 1).html()).toContain('Include');
        expect(renderColumn(0, 3).html()).toContain('');
      });

      it('can show the value type of an indexing rule as editable', () => {
        const column = renderColumnInEditingMode(0, 0);

        const selectField = column.find(EuiSelect);
        expect(selectField.props()).toEqual(
          expect.objectContaining({
            value: 'exclude',
            disabled: false,
            isInvalid: false,
            options: [
              { text: 'Include', value: 'include' },
              { text: 'Exclude', value: 'exclude' },
            ],
          })
        );

        selectField.simulate('change', { target: { value: 'include' } });
        expect(onChange).toHaveBeenCalledWith('include');
      });
    });

    describe('filter type column', () => {
      it('shows the filter type of an indexing rule', () => {
        expect(renderColumn(1, 0).html()).toContain('Path');
        expect(renderColumn(1, 1).html()).toContain('File');
        expect(renderColumn(1, 2).html()).toContain('Item');
        expect(renderColumn(1, 3).html()).toContain('');
      });

      it('can show the filter type of an indexing rule as editable', () => {
        const column = renderColumnInEditingMode(1, 0);

        const selectField = column.find(EuiSelect);
        expect(selectField.props()).toEqual(
          expect.objectContaining({
            value: 'path_template',
            disabled: false,
            isInvalid: false,
            options: [
              { text: 'Item', value: 'object_type' },
              { text: 'Path', value: 'path_template' },
              { text: 'File type', value: 'file_extension' },
            ],
          })
        );

        selectField.simulate('change', { target: { value: 'object_type' } });
        expect(onChange).toHaveBeenCalledWith('object_type');
      });
    });

    describe('pattern column', () => {
      it('shows the value of an indexing rule', () => {
        expect(renderColumn(2, 0).html()).toContain('value');
      });

      it('can show the value of a indexing rule as editable', () => {
        const column = renderColumnInEditingMode(2, 0);

        const field = column.find(EuiFieldText);
        expect(field.props()).toEqual(
          expect.objectContaining({
            value: 'value',
            disabled: false,
            isInvalid: false,
          })
        );

        field.simulate('change', { target: { value: 'foo' } });
        expect(onChange).toHaveBeenCalledWith('foo');
      });
    });
  });

  describe('when an indexing rule is added', () => {
    it('should update the indexing rules for the current domain, and clear flash messages', () => {
      const initAddIndexingRule = jest.fn();
      const done = jest.fn();
      setMockActions({
        initAddIndexingRule,
      });
      const wrapper = shallow(<IndexingRulesTable />);
      const table = wrapper.find(InlineEditableTable);

      const newIndexingRule = {
        id: 2,
        value: 'new value',
        filterType: 'path_template',
        valueType: 'include',
      };
      table.prop('onAdd')(newIndexingRule, done);
      expect(initAddIndexingRule).toHaveBeenCalledWith(newIndexingRule);
      expect(clearFlashMessages).toHaveBeenCalled();
    });
  });

  describe('when an indexing rule is updated', () => {
    it('should update the indexing rules for the current domain, and clear flash messages', () => {
      const initSetIndexingRule = jest.fn();
      const done = jest.fn();
      setMockActions({
        initSetIndexingRule,
      });
      const wrapper = shallow(<IndexingRulesTable />);
      const table = wrapper.find(InlineEditableTable);

      const newIndexingRule = {
        id: 2,
        value: 'new value',
        filterType: 'path_template',
        valueType: 'include',
      };
      table.prop('onUpdate')(newIndexingRule, done);
      expect(initSetIndexingRule).toHaveBeenCalledWith(newIndexingRule);
      expect(clearFlashMessages).toHaveBeenCalled();
    });
  });

  describe('when a indexing rule is deleted', () => {
    it('should update the indexing rules for the current domain, and clear flash messages', () => {
      const deleteIndexingRule = jest.fn();
      const done = jest.fn();
      setMockActions({
        deleteIndexingRule,
      });
      const wrapper = shallow(<IndexingRulesTable />);
      const table = wrapper.find(InlineEditableTable);

      const newIndexingRule = {
        id: 2,
        value: 'new value',
        filterType: 'path_template',
        valueType: 'include',
      };
      table.prop('onDelete')(newIndexingRule, done);
      expect(deleteIndexingRule).toHaveBeenCalledWith(newIndexingRule);
      expect(clearFlashMessages).toHaveBeenCalled();
    });
  });

  describe('when an indexing rule is reordered', () => {
    it('should update the indexing rules for the current domain, and clear flash messages', () => {
      const setIndexingRules = jest.fn();
      const done = jest.fn();
      setMockActions({
        setIndexingRules,
      });
      const wrapper = shallow(<IndexingRulesTable />);
      const table = wrapper.find(InlineEditableTable);

      const newIndexingRules = [
        {
          id: 2,
          value: 'new value',
          filterType: 'path_template',
          valueType: 'include',
        },
      ];
      table.prop('onReorder')!(newIndexingRules, indexingRules, done);
      expect(setIndexingRules).toHaveBeenCalledWith(newIndexingRules);
      expect(clearFlashMessages).toHaveBeenCalled();
    });
  });

  it('includes a bottom row message', () => {
    const wrapper = shallow(<IndexingRulesTable />);
    const table = wrapper.find(InlineEditableTable);

    expect(table.prop('bottomRows')).toHaveLength(1);
  });
});
