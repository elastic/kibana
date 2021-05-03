/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ReactWrapper } from 'enzyme';
import React from 'react';
import { getColumns } from './columns';
import { TestProviders } from '../../mock';
import { useMountAppended } from '../../utils/use_mount_appended';
import { mockBrowserFields } from '../../containers/source/mock';
import { EventFieldsData } from './types';

interface Column {
  field: string;
  name: string;
  sortable: boolean;
  render: (field: string, data: EventFieldsData) => JSX.Element;
}

describe('getColumns', () => {
  const mount = useMountAppended();
  const defaultProps = {
    browserFields: mockBrowserFields,
    columnHeaders: [],
    contextId: 'some-context',
    eventId: 'some-event',
    getLinkValue: jest.fn(),
    onUpdateColumns: jest.fn(),
    timelineId: 'some-timeline',
    toggleColumn: jest.fn(),
  };

  test('should have expected fields', () => {
    const columns = getColumns(defaultProps);
    columns.forEach((column) => {
      expect(column).toHaveProperty('field');
      expect(column).toHaveProperty('name');
      expect(column).toHaveProperty('render');
      expect(column).toHaveProperty('sortable');
    });
  });

  describe('column checkbox', () => {
    let checkboxColumn: Column;
    const mockDataToUse = mockBrowserFields.agent;
    const testData = {
      type: 'someType',
      category: 'agent',
      ...mockDataToUse,
    } as EventFieldsData;

    beforeEach(() => {
      checkboxColumn = getColumns(defaultProps)[0] as Column;
    });

    test('should be disabled when the field does not exist', () => {
      const testField = 'nonExistingField';
      const wrapper = mount(
        <TestProviders>{checkboxColumn.render(testField, testData)}</TestProviders>
      ) as ReactWrapper;
      expect(
        wrapper.find(`[data-test-subj="toggle-field-${testField}"]`).first().prop('disabled')
      ).toBe(true);
    });

    test('should be enabled when the field does exist', () => {
      const testField = mockDataToUse.fields
        ? Object.keys(mockDataToUse.fields)[0]
        : 'agent.hostname';
      const wrapper = mount(
        <TestProviders>{checkboxColumn.render(testField, testData)}</TestProviders>
      ) as ReactWrapper;
      expect(
        wrapper.find(`[data-test-subj="toggle-field-${testField}"]`).first().prop('disabled')
      ).toBe(false);
    });
  });
});
