/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from '@testing-library/react';

import * as CheckPrivilige from '../../../../../capabilities/check_capabilities';

import { DeleteAction } from './action_delete';
import { coreMock as mockCoreServices } from '../../../../../../../../../../src/core/public/mocks';
import mockAnalyticsListItem from './__mocks__/analytics_list_item.json';

jest.mock('../../../../../capabilities/check_capabilities', () => ({
  checkPermission: jest.fn(() => false),
  createPermissionFailureMessage: jest.fn(),
}));

jest.mock('../../../../../../application/util/dependency_cache', () => ({
  getToastNotifications: () => ({ addSuccess: jest.fn(), addDanger: jest.fn() }),
}));

jest.mock('../../../../../contexts/kibana', () => ({
  useMlKibana: () => ({
    services: mockCoreServices.createStart(),
  }),
}));

describe('DeleteAction', () => {
  test('When canDeleteDataFrameAnalytics permission is false, button should be disabled.', () => {
    const { getByTestId } = render(<DeleteAction item={mockAnalyticsListItem} />);
    expect(getByTestId('mlAnalyticsJobDeleteButton')).toHaveAttribute('disabled');
  });

  test('When canDeleteDataFrameAnalytics permission is true, button should not be disabled.', () => {
    const mock = jest.spyOn(CheckPrivilige, 'checkPermission');
    mock.mockImplementation(p => p === 'canDeleteDataFrameAnalytics');
    const { getByTestId } = render(<DeleteAction item={mockAnalyticsListItem} />);

    expect(getByTestId('mlAnalyticsJobDeleteButton')).not.toHaveAttribute('disabled');

    mock.mockRestore();
  });

  test('When job is running, delete button should be disabled.', () => {
    const { getByTestId } = render(
      <DeleteAction
        item={{
          ...mockAnalyticsListItem,
          stats: { state: 'started' },
        }}
      />
    );

    expect(getByTestId('mlAnalyticsJobDeleteButton')).toHaveAttribute('disabled');
  });
});
