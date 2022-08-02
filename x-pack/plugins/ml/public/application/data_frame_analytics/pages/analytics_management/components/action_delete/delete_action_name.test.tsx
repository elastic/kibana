/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import * as CheckPrivilige from '../../../../../capabilities/check_capabilities';
import mockAnalyticsListItem from '../analytics_list/__mocks__/analytics_list_item.json';
import { I18nProvider } from '@kbn/i18n-react';
import { coreMock as mockCoreServices, i18nServiceMock } from '@kbn/core/public/mocks';

import { DeleteActionName } from './delete_action_name';
import { DeleteActionModal } from './delete_action_modal';
import { useDeleteAction } from './use_delete_action';

jest.mock('../../../../../capabilities/check_capabilities', () => ({
  checkPermission: jest.fn(() => false),
  createPermissionFailureMessage: jest.fn(),
}));

jest.mock('../../../../../util/dependency_cache', () => ({
  getToastNotifications: () => ({ addSuccess: jest.fn(), addDanger: jest.fn() }),
}));

jest.mock('../../../../../contexts/kibana', () => ({
  useMlKibana: () => ({
    services: { ...mockCoreServices.createStart(), data: { data_view: { find: jest.fn() } } },
  }),
  useNotifications: () => {
    return {
      toasts: { addSuccess: jest.fn(), addDanger: jest.fn(), addError: jest.fn() },
    };
  },
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

  it('should display a tooltip when isDisabled prop is true.', () => {
    const { container } = render(
      // @ts-expect-error mock data is incorrectly typed
      <DeleteActionName isDisabled={true} item={mockAnalyticsListItem} />
    );

    expect(container.querySelector('.euiToolTipAnchor')).toBeInTheDocument();
  });

  it('should not display a tooltip when isDisabled prop is false.', () => {
    const { container } = render(
      // @ts-expect-error mock data is incorrectly typed
      <DeleteActionName isDisabled={false} item={mockAnalyticsListItem} />
    );

    expect(container.querySelector('.euiToolTipAnchor')).not.toBeInTheDocument();
  });

  describe('When delete model is open', () => {
    it('should not allow to delete target index by default.', () => {
      const mock = jest.spyOn(CheckPrivilige, 'checkPermission');
      mock.mockImplementation((p) => p === 'canDeleteDataFrameAnalytics');

      const TestComponent = () => {
        const deleteAction = useDeleteAction(true);

        return (
          <>
            {deleteAction.isModalVisible && <DeleteActionModal {...deleteAction} />}
            <button
              data-test-subj="mlAnalyticsJobDeleteButton"
              onClick={() => {
                // @ts-expect-error mock data is incorrectly typed
                deleteAction.openModal(mockAnalyticsListItem);
              }}
            >
              {/* @ts-expect-error mock data is incorrectly typed */}
              <DeleteActionName isDisabled={false} item={mockAnalyticsListItem} />
            </button>
          </>
        );
      };

      const { getByTestId, queryByTestId } = render(
        <I18nProvider>
          <TestComponent />
        </I18nProvider>
      );
      const deleteButton = getByTestId('mlAnalyticsJobDeleteButton');
      fireEvent.click(deleteButton);
      expect(getByTestId('mlAnalyticsJobDeleteModal')).toBeInTheDocument();
      expect(queryByTestId('mlAnalyticsJobDeleteIndexSwitch')).toBeNull();
      expect(queryByTestId('mlAnalyticsJobDeleteIndexPatternSwitch')).toBeNull();

      mock.mockRestore();
    });
  });
});
