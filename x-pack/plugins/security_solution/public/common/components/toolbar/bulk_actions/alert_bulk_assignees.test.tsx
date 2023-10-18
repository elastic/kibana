/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineItem } from '@kbn/timelines-plugin/common';
import { act, fireEvent, render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../mock';
import { useSuggestUsers } from '../../../../detections/containers/detection_engine/alerts/use_suggest_users';

import { BulkAlertAssigneesPanel } from './alert_bulk_assignees';
import { ALERT_WORKFLOW_ASSIGNEE_IDS } from '@kbn/rule-data-utils';

jest.mock('../../../../detections/containers/detection_engine/alerts/use_suggest_users');

const mockUserProfiles = [
  { uid: 'default-test-assignee-id-1', enabled: true, user: { username: 'user1' }, data: {} },
  { uid: 'default-test-assignee-id-2', enabled: true, user: { username: 'user2' }, data: {} },
];

const mockAssigneeItems = [
  {
    _id: 'test-id',
    data: [{ field: ALERT_WORKFLOW_ASSIGNEE_IDS, value: ['assignee-id-1', 'assignee-id-2'] }],
    ecs: { _id: 'test-id' },
  },
];

(useSuggestUsers as jest.Mock).mockReturnValue({ loading: false, userProfiles: mockUserProfiles });

const renderAssigneesMenu = (
  items: TimelineItem[],
  closePopover: () => void = jest.fn(),
  onSubmit: () => Promise<void> = jest.fn(),
  setIsLoading: () => void = jest.fn()
) => {
  return render(
    <TestProviders>
      <BulkAlertAssigneesPanel
        alertItems={items}
        setIsLoading={setIsLoading}
        closePopoverMenu={closePopover}
        onSubmit={onSubmit}
      />
    </TestProviders>
  );
};

describe('BulkAlertAssigneesPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('it renders', () => {
    const wrapper = renderAssigneesMenu(mockAssigneeItems);

    expect(wrapper.getByTestId('alert-assignees-update-button')).toBeInTheDocument();
    expect(useSuggestUsers).toHaveBeenCalled();
  });

  test('it calls expected functions on submit when nothing has changed', () => {
    const mockedClosePopover = jest.fn();
    const mockedOnSubmit = jest.fn();
    const mockedSetIsLoading = jest.fn();

    const mockAssignees = [
      {
        _id: 'test-id',
        data: [{ field: ALERT_WORKFLOW_ASSIGNEE_IDS, value: ['default-test-assignee-id-1'] }],
        ecs: { _id: 'test-id' },
      },
      {
        _id: 'test-id',
        data: [
          {
            field: ALERT_WORKFLOW_ASSIGNEE_IDS,
            value: ['default-test-assignee-id-1', 'default-test-assignee-id-2'],
          },
        ],
        ecs: { _id: 'test-id' },
      },
    ];
    const wrapper = renderAssigneesMenu(
      mockAssignees,
      mockedClosePopover,
      mockedOnSubmit,
      mockedSetIsLoading
    );

    act(() => {
      fireEvent.click(wrapper.getByTestId('alert-assignees-update-button'));
    });
    expect(mockedClosePopover).toHaveBeenCalled();
    expect(mockedOnSubmit).not.toHaveBeenCalled();
    expect(mockedSetIsLoading).not.toHaveBeenCalled();
  });

  test('it updates state correctly', () => {
    const mockAssignees = [
      {
        _id: 'test-id',
        data: [{ field: ALERT_WORKFLOW_ASSIGNEE_IDS, value: ['default-test-assignee-id-1'] }],
        ecs: { _id: 'test-id' },
      },
      {
        _id: 'test-id',
        data: [
          {
            field: ALERT_WORKFLOW_ASSIGNEE_IDS,
            value: ['default-test-assignee-id-1', 'default-test-assignee-id-2'],
          },
        ],
        ecs: { _id: 'test-id' },
      },
    ];
    const wrapper = renderAssigneesMenu(mockAssignees);

    expect(wrapper.getAllByRole('option')[0]).toHaveAttribute('title', 'user1');
    expect(wrapper.getAllByRole('option')[0]).toBeChecked();
    act(() => {
      fireEvent.click(wrapper.getByText('user1'));
    });
    expect(wrapper.getAllByRole('option')[0]).toHaveAttribute('title', 'user1');
    expect(wrapper.getAllByRole('option')[0]).not.toBeChecked();

    expect(wrapper.getAllByRole('option')[1]).toHaveAttribute('title', 'user2');
    expect(wrapper.getAllByRole('option')[1]).not.toBeChecked();
    act(() => {
      fireEvent.click(wrapper.getByText('user2'));
    });
    expect(wrapper.getAllByRole('option')[1]).toHaveAttribute('title', 'user2');
    expect(wrapper.getAllByRole('option')[1]).toBeChecked();
  });

  test('it calls expected functions on submit when alerts have changed', () => {
    const mockedClosePopover = jest.fn();
    const mockedOnSubmit = jest.fn();
    const mockedSetIsLoading = jest.fn();

    const mockAssignees = [
      {
        _id: 'test-id',
        data: [{ field: ALERT_WORKFLOW_ASSIGNEE_IDS, value: ['default-test-assignee-id-1'] }],
        ecs: { _id: 'test-id' },
      },
      {
        _id: 'test-id',
        data: [
          {
            field: ALERT_WORKFLOW_ASSIGNEE_IDS,
            value: ['default-test-assignee-id-1', 'default-test-assignee-id-2'],
          },
        ],
        ecs: { _id: 'test-id' },
      },
    ];
    const wrapper = renderAssigneesMenu(
      mockAssignees,
      mockedClosePopover,
      mockedOnSubmit,
      mockedSetIsLoading
    );
    act(() => {
      fireEvent.click(wrapper.getByText('user1'));
    });
    act(() => {
      fireEvent.click(wrapper.getByText('user2'));
    });

    act(() => {
      fireEvent.click(wrapper.getByTestId('alert-assignees-update-button'));
    });
    expect(mockedClosePopover).toHaveBeenCalled();
    expect(mockedOnSubmit).toHaveBeenCalled();
    expect(mockedOnSubmit).toHaveBeenCalledWith(
      {
        assignees_to_add: ['default-test-assignee-id-2'],
        assignees_to_remove: ['default-test-assignee-id-1'],
      },
      ['test-id', 'test-id'],
      expect.anything(), // An anonymous callback defined in the onSubmit function
      mockedSetIsLoading
    );
  });
});
