/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiFieldText } from '@elastic/eui';

import { GenericEndpointInlineEditableTable } from '../../../../shared/tables/generic_endpoint_inline_editable_table';

import { mountWithIntl } from '../../../../test_helpers';

import { CrawlerDomain } from '../types';

import { EntryPointsTable } from './entry_points_table';

describe('EntryPointsTable', () => {
  const engineName = 'my-engine';
  const entryPoints = [
    { id: '1', value: '/whatever' },
    { id: '2', value: '/foo' },
  ];
  const domain: CrawlerDomain = {
    createdOn: '2018-01-01T00:00:00.000Z',
    documentCount: 10,
    id: '6113e1407a2f2e6f42489794',
    url: 'https://www.elastic.co',
    crawlRules: [],
    entryPoints,
    sitemaps: [],
    deduplicationEnabled: true,
    deduplicationFields: ['title'],
    availableDeduplicationFields: ['title', 'description'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    const wrapper = shallow(
      <EntryPointsTable domain={domain} engineName={engineName} items={domain.entryPoints} />
    );

    expect(wrapper.find(GenericEndpointInlineEditableTable).exists()).toBe(true);
  });

  describe('the first and only column in the table', () => {
    it('shows the value of an entry point', () => {
      const entryPoint = { id: '1', value: '/whatever' };

      const wrapper = shallow(
        <EntryPointsTable domain={domain} engineName={engineName} items={domain.entryPoints} />
      );

      const columns = wrapper.find(GenericEndpointInlineEditableTable).prop('columns');
      const column = shallow(<div>{columns[0].render(entryPoint)}</div>);
      expect(column.html()).toContain('/whatever');
    });

    it('can show the value of an entry point as editable', () => {
      const entryPoint = { id: '1', value: '/whatever' };
      const onChange = jest.fn();

      const wrapper = shallow(
        <EntryPointsTable domain={domain} engineName={engineName} items={domain.entryPoints} />
      );

      const columns = wrapper.find(GenericEndpointInlineEditableTable).prop('columns');
      const column = shallow(
        <div>
          {columns[0].editingRender(entryPoint, onChange, { isInvalid: false, isLoading: false })}
        </div>
      );

      const textField = column.find(EuiFieldText);
      expect(textField.props()).toEqual(
        expect.objectContaining({
          value: '/whatever',
          disabled: false, // It would be disabled if isLoading is true
          isInvalid: false,
          prepend: 'https://www.elastic.co',
        })
      );

      textField.simulate('change', { target: { value: '/foo' } });
      expect(onChange).toHaveBeenCalledWith('/foo');
    });
  });

  describe('routes', () => {
    it('can calculate an update and delete route correctly', () => {
      const wrapper = shallow(
        <EntryPointsTable domain={domain} engineName={engineName} items={domain.entryPoints} />
      );

      const table = wrapper.find(GenericEndpointInlineEditableTable);

      const entryPoint = { id: '1', value: '/whatever' };
      expect(table.prop('deleteRoute')(entryPoint)).toEqual(
        '/api/app_search/engines/my-engine/crawler/domains/6113e1407a2f2e6f42489794/entry_points/1'
      );
      expect(table.prop('updateRoute')(entryPoint)).toEqual(
        '/api/app_search/engines/my-engine/crawler/domains/6113e1407a2f2e6f42489794/entry_points/1'
      );
    });
  });

  it('shows a no items message whem there are no entry points to show', () => {
    const wrapper = shallow(
      <EntryPointsTable domain={domain} engineName={engineName} items={domain.entryPoints} />
    );

    const editNewItems = jest.fn();
    const table = wrapper.find(GenericEndpointInlineEditableTable);
    const message = mountWithIntl(<div>{table.prop('noItemsMessage')!(editNewItems)}</div>);
    expect(message.html()).toContain('There are no existing entry points.');
  });
});
