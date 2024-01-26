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
import { useUiSetting$ } from '../../../lib/kibana';
import * as helpers from './helpers';

import { BulkAlertTagsPanel } from './alert_bulk_tags';
import { ALERT_WORKFLOW_TAGS } from '@kbn/rule-data-utils';

jest.mock('../../../lib/kibana');

const mockTagItems = [
  {
    _id: 'test-id',
    data: [{ field: ALERT_WORKFLOW_TAGS, value: ['tag-1', 'tag-2'] }],
    ecs: { _id: 'test-id' },
  },
];

(useUiSetting$ as jest.Mock).mockReturnValue([['default-test-tag-1', 'default-test-tag-2']]);
const createInitialTagsState = jest.spyOn(helpers, 'createInitialTagsState');

const renderTagsMenu = (
  tags: TimelineItem[],
  closePopover: () => void = jest.fn(),
  onSubmit: () => Promise<void> = jest.fn(),
  setIsLoading: () => void = jest.fn()
) => {
  return render(
    <TestProviders>
      <BulkAlertTagsPanel
        alertItems={tags}
        setIsLoading={setIsLoading}
        closePopoverMenu={closePopover}
        onSubmit={onSubmit}
      />
    </TestProviders>
  );
};

describe('BulkAlertTagsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('it renders', () => {
    const wrapper = renderTagsMenu(mockTagItems);

    expect(wrapper.getByTestId('alert-tags-selectable-menu')).toBeInTheDocument();
    expect(createInitialTagsState).toHaveBeenCalled();
  });

  test('it renders a valid state when existing alert tags are passed', () => {
    const mockTags = [
      {
        _id: 'test-id',
        data: [{ field: ALERT_WORKFLOW_TAGS, value: ['default-test-tag-1'] }],
        ecs: { _id: 'test-id' },
      },
    ];
    const wrapper = renderTagsMenu(mockTags);

    expect(wrapper.getByTestId('selected-alert-tag')).toHaveTextContent('default-test-tag-1');
    expect(wrapper.getByTestId('unselected-alert-tag')).toHaveTextContent('default-test-tag-2');
  });

  test('it renders a valid state when multiple alerts with tags are passed', () => {
    const mockTags = [
      {
        _id: 'test-id',
        data: [{ field: ALERT_WORKFLOW_TAGS, value: ['default-test-tag-1'] }],
        ecs: { _id: 'test-id' },
      },
      {
        _id: 'test-id',
        data: [{ field: ALERT_WORKFLOW_TAGS, value: ['default-test-tag-1', 'default-test-tag-2'] }],
        ecs: { _id: 'test-id' },
      },
    ];
    const wrapper = renderTagsMenu(mockTags);

    expect(wrapper.getByTestId('selected-alert-tag')).toHaveTextContent('default-test-tag-1');
    expect(wrapper.getByTestId('mixed-alert-tag')).toHaveTextContent('default-test-tag-2');
  });

  test('it calls expected functions on submit when nothing has changed', () => {
    const mockedClosePopover = jest.fn();
    const mockedOnSubmit = jest.fn();
    const mockedSetIsLoading = jest.fn();

    const mockTags = [
      {
        _id: 'test-id',
        data: [{ field: ALERT_WORKFLOW_TAGS, value: ['default-test-tag-1'] }],
        ecs: { _id: 'test-id' },
      },
      {
        _id: 'test-id',
        data: [{ field: ALERT_WORKFLOW_TAGS, value: ['default-test-tag-1', 'default-test-tag-2'] }],
        ecs: { _id: 'test-id' },
      },
    ];
    const wrapper = renderTagsMenu(
      mockTags,
      mockedClosePopover,
      mockedOnSubmit,
      mockedSetIsLoading
    );

    act(() => {
      fireEvent.click(wrapper.getByTestId('alert-tags-update-button'));
    });
    expect(mockedClosePopover).toHaveBeenCalled();
    expect(mockedOnSubmit).not.toHaveBeenCalled();
    expect(mockedSetIsLoading).not.toHaveBeenCalled();
  });

  test('it updates state correctly', () => {
    const mockTags = [
      {
        _id: 'test-id',
        data: [{ field: ALERT_WORKFLOW_TAGS, value: ['default-test-tag-1'] }],
        ecs: { _id: 'test-id' },
      },
      {
        _id: 'test-id',
        data: [{ field: ALERT_WORKFLOW_TAGS, value: ['default-test-tag-1', 'default-test-tag-2'] }],
        ecs: { _id: 'test-id' },
      },
    ];
    const wrapper = renderTagsMenu(mockTags);

    expect(wrapper.getByTitle('default-test-tag-1')).toBeChecked();
    act(() => {
      fireEvent.click(wrapper.getByText('default-test-tag-1'));
    });
    expect(wrapper.getByTitle('default-test-tag-1')).not.toBeChecked();

    expect(wrapper.getByTitle('default-test-tag-2')).not.toBeChecked();
    act(() => {
      fireEvent.click(wrapper.getByText('default-test-tag-2'));
    });
    expect(wrapper.getByTitle('default-test-tag-2')).toBeChecked();
  });

  test('it calls expected functions on submit when alerts have changed', () => {
    const mockedClosePopover = jest.fn();
    const mockedOnSubmit = jest.fn();
    const mockedSetIsLoading = jest.fn();

    const mockTags = [
      {
        _id: 'test-id',
        data: [{ field: ALERT_WORKFLOW_TAGS, value: ['default-test-tag-1'] }],
        ecs: { _id: 'test-id' },
      },
      {
        _id: 'test-id',
        data: [{ field: ALERT_WORKFLOW_TAGS, value: ['default-test-tag-1', 'default-test-tag-2'] }],
        ecs: { _id: 'test-id' },
      },
    ];
    const wrapper = renderTagsMenu(
      mockTags,
      mockedClosePopover,
      mockedOnSubmit,
      mockedSetIsLoading
    );
    act(() => {
      fireEvent.click(wrapper.getByText('default-test-tag-1'));
    });
    act(() => {
      fireEvent.click(wrapper.getByText('default-test-tag-2'));
    });

    act(() => {
      fireEvent.click(wrapper.getByTestId('alert-tags-update-button'));
    });
    expect(mockedClosePopover).toHaveBeenCalled();
    expect(mockedOnSubmit).toHaveBeenCalled();
    expect(mockedOnSubmit).toHaveBeenCalledWith(
      { tags_to_add: ['default-test-tag-2'], tags_to_remove: ['default-test-tag-1'] },
      ['test-id', 'test-id'],
      expect.anything(), // An anonymous callback defined in the onSubmit function
      mockedSetIsLoading
    );
  });
});
