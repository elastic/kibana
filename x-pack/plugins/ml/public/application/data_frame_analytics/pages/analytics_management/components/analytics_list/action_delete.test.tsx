/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import * as CheckPrivilige from '../../../../../capabilities/check_capabilities';
import mockAnalyticsListItem from './__mocks__/analytics_list_item.json';
import { DeleteAction } from './action_delete';
import { I18nProvider } from '@kbn/i18n/react';
import {
  coreMock as mockCoreServices,
  i18nServiceMock,
} from '../../../../../../../../../../src/core/public/mocks';

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
export const MockI18nService = i18nServiceMock.create();
export const I18nServiceConstructor = jest.fn().mockImplementation(() => MockI18nService);
jest.doMock('@kbn/i18n', () => ({
  I18nService: I18nServiceConstructor,
}));

describe('DeleteAction', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('When canDeleteDataFrameAnalytics permission is false, button should be disabled.', () => {
    const { getByTestId } = render(<DeleteAction item={mockAnalyticsListItem} />);
    expect(getByTestId('mlAnalyticsJobDeleteButton')).toHaveAttribute('disabled');
  });

  test('When canDeleteDataFrameAnalytics permission is true, button should not be disabled.', () => {
    const mock = jest.spyOn(CheckPrivilige, 'checkPermission');
    mock.mockImplementation((p) => p === 'canDeleteDataFrameAnalytics');
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

  describe('When delete model is open', () => {
    test('should allow to delete target index by default.', () => {
      const mock = jest.spyOn(CheckPrivilige, 'checkPermission');
      mock.mockImplementation((p) => p === 'canDeleteDataFrameAnalytics');
      const { getByTestId, queryByTestId } = render(
        <I18nProvider>
          <DeleteAction item={mockAnalyticsListItem} />
        </I18nProvider>
      );
      const deleteButton = getByTestId('mlAnalyticsJobDeleteButton');
      fireEvent.click(deleteButton);
      expect(getByTestId('mlAnalyticsJobDeleteModal')).toBeInTheDocument();
      expect(getByTestId('mlAnalyticsJobDeleteIndexSwitch')).toBeInTheDocument();
      const mlAnalyticsJobDeleteIndexSwitch = getByTestId('mlAnalyticsJobDeleteIndexSwitch');
      expect(mlAnalyticsJobDeleteIndexSwitch).toHaveAttribute('aria-checked', 'true');
      expect(queryByTestId('mlAnalyticsJobDeleteIndexPatternSwitch')).toBeNull();
      mock.mockRestore();
    });
  });
});
