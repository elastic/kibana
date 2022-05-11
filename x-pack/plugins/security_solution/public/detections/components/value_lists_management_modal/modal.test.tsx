/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { waitFor } from '@testing-library/react';

import { getListResponseMock } from '@kbn/lists-plugin/common/schemas/response/list_schema.mock';
import { useDeleteList, useFindLists } from '@kbn/securitysolution-list-hooks';
import { exportList } from '@kbn/securitysolution-list-api';
import type { ListSchema } from '@kbn/securitysolution-io-ts-list-types';

import { TestProviders } from '../../../common/mock';
import { ValueListsModal } from './modal';

jest.mock('@kbn/securitysolution-list-hooks', () => {
  const actual = jest.requireActual('@kbn/securitysolution-list-hooks');

  return {
    ...actual,
    useDeleteList: jest.fn(),
    useFindLists: jest.fn(),
  };
});

jest.mock('@kbn/securitysolution-list-api', () => {
  const actual = jest.requireActual('@kbn/securitysolution-list-api');

  return {
    ...actual,
    exportList: jest.fn(),
  };
});

describe('ValueListsModal', () => {
  beforeEach(() => {
    // Do not resolve the export in tests as it causes unexpected state updates
    (exportList as jest.Mock).mockImplementation(() => new Promise(() => {}));
    (useFindLists as jest.Mock).mockReturnValue({
      start: jest.fn(),
      result: { data: Array<ListSchema>(3).fill(getListResponseMock()), total: 3 },
    });
    (useDeleteList as jest.Mock).mockReturnValue({
      start: jest.fn(),
      result: getListResponseMock(),
    });
  });

  it('renders nothing if showModal is false', () => {
    const container = mount(
      <TestProviders>
        <ValueListsModal showModal={false} onClose={jest.fn()} />
      </TestProviders>
    );

    expect(container.find('EuiModal')).toHaveLength(0);
  });

  it('renders modal if showModal is true', () => {
    const container = mount(
      <TestProviders>
        <ValueListsModal showModal={true} onClose={jest.fn()} />
      </TestProviders>
    );

    expect(container.find('EuiModal')).toHaveLength(1);
  });

  it('calls onClose when modal is closed', () => {
    const onClose = jest.fn();
    const container = mount(
      <TestProviders>
        <ValueListsModal showModal={true} onClose={onClose} />
      </TestProviders>
    );

    container.find('button[data-test-subj="value-lists-modal-close-action"]').simulate('click');

    expect(onClose).toHaveBeenCalled();
  });

  it('renders ValueListsForm and an EuiTable', () => {
    const container = mount(
      <TestProviders>
        <ValueListsModal showModal={true} onClose={jest.fn()} />
      </TestProviders>
    );

    expect(container.find('ValueListsForm')).toHaveLength(1);
    expect(container.find('EuiBasicTable')).toHaveLength(1);
  });

  describe('modal table actions', () => {
    it('calls exportList when export is clicked', async () => {
      const container = mount(
        <TestProviders>
          <ValueListsModal showModal={true} onClose={jest.fn()} />
        </TestProviders>
      );

      await waitFor(() => {
        container
          .find('button[data-test-subj="action-export-value-list"]')
          .first()
          .simulate('click');
      });

      expect(exportList).toHaveBeenCalledWith(expect.objectContaining({ listId: 'some-list-id' }));
    });

    it('calls deleteList when delete is clicked', async () => {
      const deleteListMock = jest.fn();
      (useDeleteList as jest.Mock).mockReturnValue({
        start: deleteListMock,
        result: getListResponseMock(),
      });
      const container = mount(
        <TestProviders>
          <ValueListsModal showModal={true} onClose={jest.fn()} />
        </TestProviders>
      );

      await waitFor(() => {
        container
          .find('button[data-test-subj="action-delete-value-list-some name"]')
          .first()
          .simulate('click');
      });

      expect(deleteListMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'some-list-id' }));
    });
  });
});
