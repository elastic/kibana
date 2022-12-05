/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, fireEvent } from '@testing-library/react';
import React from 'react';

import { useBulkExport } from '../../../../detection_engine/rule_management/logic/bulk_actions/use_bulk_export';
import { useExecuteBulkAction } from '../../../../detection_engine/rule_management/logic/bulk_actions/use_execute_bulk_action';

import { RuleActionsOverflow } from '.';
import { mockRule } from '../../../../detection_engine/rule_management_ui/components/rules_table/__mocks__/mock';
import { TestProviders } from '../../../../common/mock';

const showBulkDuplicateExceptionsConfirmation = () => Promise.resolve(null);

jest.mock(
  '../../../../detection_engine/rule_management/logic/bulk_actions/use_execute_bulk_action'
);
jest.mock('../../../../detection_engine/rule_management/logic/bulk_actions/use_bulk_export');
jest.mock('../../../../common/lib/apm/use_start_transaction');
jest.mock('../../../../common/hooks/use_app_toasts');
jest.mock('../../../../common/lib/kibana', () => {
  const actual = jest.requireActual('../../../../common/lib/kibana');
  return {
    ...actual,
    useKibana: jest.fn().mockReturnValue({
      services: {
        application: {
          navigateToApp: jest.fn(),
        },
      },
    }),
  };
});

const useExecuteBulkActionMock = useExecuteBulkAction as jest.Mock;
const useBulkExportMock = useBulkExport as jest.Mock;

describe('RuleActionsOverflow', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  afterAll(() => {
    jest.resetAllMocks();
  });

  describe('rules details menu panel', () => {
    test('menu items rendered when a rule is passed to the component', () => {
      const { getByTestId } = render(
        <RuleActionsOverflow
          showBulkDuplicateExceptionsConfirmation={showBulkDuplicateExceptionsConfirmation}
          rule={mockRule('id')}
          userHasPermissions
          canDuplicateRuleWithActions={true}
        />,
        { wrapper: TestProviders }
      );
      fireEvent.click(getByTestId('rules-details-popover-button-icon'));
      expect(getByTestId('rules-details-menu-panel')).toHaveTextContent('Duplicate rule');
      expect(getByTestId('rules-details-menu-panel')).toHaveTextContent('Export rule');
      expect(getByTestId('rules-details-menu-panel')).toHaveTextContent('Delete rule');
    });

    test('menu is empty when no rule is passed to the component', () => {
      const { getByTestId } = render(
        <RuleActionsOverflow
          showBulkDuplicateExceptionsConfirmation={showBulkDuplicateExceptionsConfirmation}
          rule={null}
          userHasPermissions
          canDuplicateRuleWithActions={true}
        />,
        { wrapper: TestProviders }
      );
      fireEvent.click(getByTestId('rules-details-popover-button-icon'));
      expect(getByTestId('rules-details-menu-panel')).not.toHaveTextContent(/.+/);
    });
  });

  describe('rules details pop over button icon', () => {
    test('it does not open the popover when rules-details-popover-button-icon is clicked when the user does not have permission', () => {
      const { getByTestId } = render(
        <RuleActionsOverflow
          showBulkDuplicateExceptionsConfirmation={showBulkDuplicateExceptionsConfirmation}
          rule={mockRule('id')}
          userHasPermissions={false}
          canDuplicateRuleWithActions={true}
        />,
        { wrapper: TestProviders }
      );
      fireEvent.click(getByTestId('rules-details-popover-button-icon'));

      expect(getByTestId('rules-details-popover')).not.toHaveTextContent(/.+/);
    });
  });

  describe('rules details duplicate rule', () => {
    test('it closes the popover when rules-details-duplicate-rule is clicked', () => {
      const { getByTestId } = render(
        <RuleActionsOverflow
          showBulkDuplicateExceptionsConfirmation={showBulkDuplicateExceptionsConfirmation}
          rule={mockRule('id')}
          userHasPermissions
          canDuplicateRuleWithActions={true}
        />,
        { wrapper: TestProviders }
      );
      fireEvent.click(getByTestId('rules-details-popover-button-icon'));
      fireEvent.click(getByTestId('rules-details-duplicate-rule'));

      expect(getByTestId('rules-details-popover')).not.toHaveTextContent(/.+/);
    });
  });

  describe('rules details export rule', () => {
    test('should call export actions and display toast when export option is clicked', async () => {
      const bulkExport = jest.fn();
      useBulkExportMock.mockReturnValue({ bulkExport });

      const { getByTestId } = render(
        <RuleActionsOverflow
          showBulkDuplicateExceptionsConfirmation={showBulkDuplicateExceptionsConfirmation}
          rule={mockRule('id')}
          userHasPermissions
          canDuplicateRuleWithActions={true}
        />,
        { wrapper: TestProviders }
      );
      fireEvent.click(getByTestId('rules-details-popover-button-icon'));
      fireEvent.click(getByTestId('rules-details-export-rule'));

      expect(bulkExport).toHaveBeenCalled();
    });

    test('it closes the popover when rules-details-export-rule is clicked', () => {
      const { getByTestId } = render(
        <RuleActionsOverflow
          showBulkDuplicateExceptionsConfirmation={showBulkDuplicateExceptionsConfirmation}
          rule={mockRule('id')}
          userHasPermissions
          canDuplicateRuleWithActions={true}
        />,
        { wrapper: TestProviders }
      );
      fireEvent.click(getByTestId('rules-details-popover-button-icon'));
      fireEvent.click(getByTestId('rules-details-export-rule'));

      // Popover is not shown
      expect(getByTestId('rules-details-popover')).not.toHaveTextContent(/.+/);
    });
  });

  describe('rules details delete rule', () => {
    test('it closes the popover when rules-details-delete-rule is clicked', () => {
      const { getByTestId } = render(
        <RuleActionsOverflow
          showBulkDuplicateExceptionsConfirmation={showBulkDuplicateExceptionsConfirmation}
          rule={mockRule('id')}
          userHasPermissions
          canDuplicateRuleWithActions={true}
        />,
        { wrapper: TestProviders }
      );
      fireEvent.click(getByTestId('rules-details-popover-button-icon'));
      fireEvent.click(getByTestId('rules-details-delete-rule'));

      // Popover is not shown
      expect(getByTestId('rules-details-popover')).not.toHaveTextContent(/.+/);
    });

    test('it calls deleteRulesAction when rules-details-delete-rule is clicked', () => {
      const executeBulkAction = jest.fn();
      useExecuteBulkActionMock.mockReturnValue({ executeBulkAction });

      const { getByTestId } = render(
        <RuleActionsOverflow
          showBulkDuplicateExceptionsConfirmation={showBulkDuplicateExceptionsConfirmation}
          rule={mockRule('id')}
          userHasPermissions
          canDuplicateRuleWithActions={true}
        />,
        { wrapper: TestProviders }
      );
      fireEvent.click(getByTestId('rules-details-popover-button-icon'));
      fireEvent.click(getByTestId('rules-details-delete-rule'));

      expect(executeBulkAction).toHaveBeenCalledWith(expect.objectContaining({ type: 'delete' }));
    });

    test('it calls deleteRulesAction with the rule.id when rules-details-delete-rule is clicked', () => {
      const executeBulkAction = jest.fn();
      useExecuteBulkActionMock.mockReturnValue({ executeBulkAction });

      const rule = mockRule('id');
      const { getByTestId } = render(
        <RuleActionsOverflow
          showBulkDuplicateExceptionsConfirmation={showBulkDuplicateExceptionsConfirmation}
          rule={rule}
          userHasPermissions
          canDuplicateRuleWithActions={true}
        />,
        { wrapper: TestProviders }
      );
      fireEvent.click(getByTestId('rules-details-popover-button-icon'));
      fireEvent.click(getByTestId('rules-details-delete-rule'));

      expect(executeBulkAction).toHaveBeenCalledWith({ type: 'delete', ids: ['id'] });
    });
  });
});
