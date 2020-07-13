/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';
import { act } from 'react-dom/test-utils';

import { getListResponseMock } from '../../../../../lists/common/schemas/response/list_schema.mock';
import { ListSchema } from '../../../../../lists/common/schemas/response';
import { TestProviders } from '../../../common/mock';
import { ValueListsTable } from './table';

describe('ValueListsTable', () => {
  it('renders a row for each list', () => {
    const lists = Array<ListSchema>(3).fill(getListResponseMock());
    const container = mount(
      <TestProviders>
        <ValueListsTable
          lists={lists}
          onChange={jest.fn()}
          loading={false}
          onExport={jest.fn()}
          onDelete={jest.fn()}
          pagination={{ pageIndex: 0, pageSize: 5, totalItemCount: 10 }}
        />
      </TestProviders>
    );

    expect(container.find('tbody tr')).toHaveLength(3);
  });

  it('calls onChange when pagination is modified', () => {
    const lists = Array<ListSchema>(6).fill(getListResponseMock());
    const onChange = jest.fn();
    const container = mount(
      <TestProviders>
        <ValueListsTable
          lists={lists}
          onChange={onChange}
          loading={false}
          onExport={jest.fn()}
          onDelete={jest.fn()}
          pagination={{ pageIndex: 0, pageSize: 5, totalItemCount: 10 }}
        />
      </TestProviders>
    );

    act(() => {
      container.find('a[data-test-subj="pagination-button-next"]').simulate('click');
    });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ page: expect.objectContaining({ index: 1 }) })
    );
  });

  it('calls onExport when export is clicked', () => {
    const lists = Array<ListSchema>(3).fill(getListResponseMock());
    const onExport = jest.fn();
    const container = mount(
      <TestProviders>
        <ValueListsTable
          lists={lists}
          onChange={jest.fn()}
          loading={false}
          onExport={onExport}
          onDelete={jest.fn()}
          pagination={{ pageIndex: 0, pageSize: 5, totalItemCount: 10 }}
        />
      </TestProviders>
    );

    act(() => {
      container
        .find('tbody tr')
        .first()
        .find('button[data-test-subj="action-export-value-list"]')
        .simulate('click');
    });

    expect(onExport).toHaveBeenCalledWith(expect.objectContaining({ id: 'some-list-id' }));
  });

  it('calls onDelete when delete is clicked', () => {
    const lists = Array<ListSchema>(3).fill(getListResponseMock());
    const onDelete = jest.fn();
    const container = mount(
      <TestProviders>
        <ValueListsTable
          lists={lists}
          onChange={jest.fn()}
          loading={false}
          onExport={jest.fn()}
          onDelete={onDelete}
          pagination={{ pageIndex: 0, pageSize: 5, totalItemCount: 10 }}
        />
      </TestProviders>
    );

    act(() => {
      container
        .find('tbody tr')
        .first()
        .find('button[data-test-subj="action-delete-value-list"]')
        .simulate('click');
    });

    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'some-list-id' }));
  });
});
