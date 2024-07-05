/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ReactWrapper } from 'enzyme';
import React from 'react';
import { getColumns } from './columns';
import { TestProviders } from '../../mock';
import { useMountAppended } from '../../utils/use_mount_appended';
import { mockBrowserFields } from '../../containers/source/mock';
import type { EventFieldsData } from './types';

jest.mock('../../lib/kibana');

jest.mock('@kbn/cell-actions/src/hooks/use_load_actions', () => {
  const actual = jest.requireActual('@kbn/cell-actions/src/hooks/use_load_actions');
  return {
    ...actual,
    useLoadActions: jest.fn().mockImplementation(() => ({
      value: [],
      error: undefined,
      loading: false,
    })),
  };
});

jest.mock('../../hooks/use_get_field_spec');

interface Column {
  field: string;
  name: string | JSX.Element;
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
    scopeId: 'some-timeline',
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

  describe('column actions', () => {
    let actionsColumn: Column;
    const mockDataToUse = mockBrowserFields.agent.fields;
    const testValue = 'testValue';
    const testData = {
      type: 'someType',
      category: 'agent',
      field: 'agent.id',
      ...mockDataToUse,
    } as EventFieldsData;

    beforeEach(() => {
      actionsColumn = getColumns(defaultProps)[0] as Column;
    });

    test('it renders inline actions', () => {
      const wrapper = mount(
        <TestProviders>{actionsColumn.render(testValue, testData)}</TestProviders>
      ) as ReactWrapper;

      expect(wrapper.find('[data-test-subj="inlineActions"]').exists()).toBeTruthy();
    });

    test('it does not render inline actions when readOnly prop is passed', () => {
      actionsColumn = getColumns({ ...defaultProps, isReadOnly: true })[0] as Column;
      const wrapper = mount(
        <TestProviders>{actionsColumn.render(testValue, testData)}</TestProviders>
      ) as ReactWrapper;

      expect(wrapper.find('[data-test-subj="inlineActions"]').exists()).toBeFalsy();
    });
  });
});
