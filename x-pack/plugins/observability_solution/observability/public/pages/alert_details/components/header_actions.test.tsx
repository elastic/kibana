/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent } from '@testing-library/react';
import { triggersActionsUiMock } from '@kbn/triggers-actions-ui-plugin/public/mocks';
import { casesPluginMock } from '@kbn/cases-plugin/public/mocks';

import { render } from '../../../utils/test_helper';
import { useKibana } from '../../../utils/kibana_react';
import { kibanaStartMock } from '../../../utils/kibana_react.mock';
import { alertWithGroupsAndTags, mockAlertUuid, untrackedAlert } from '../mock/alert';
import { useFetchRule } from '../../../hooks/use_fetch_rule';

import { HeaderActions } from './header_actions';
import { CasesPublicStart } from '@kbn/cases-plugin/public';
import { AlertStatus, ALERT_STATUS } from '@kbn/rule-data-utils';
import { OBSERVABILITY_BASE_PATH, RULES_PATH } from '../../../../common/locators/paths';

jest.mock('../../../utils/kibana_react');
jest.mock('../../../hooks/use_fetch_rule');

const useKibanaMock = useKibana as jest.Mock;
const useFetchRuleMock = useFetchRule as jest.Mock;
const mockCases = casesPluginMock.createStartContract();

const mockHttp = {
  basePath: {
    prepend: (url: string) => `wow${url}`,
  },
};

const mockGetEditRuleFlyout = jest.fn(() => (
  <div data-test-subj="edit-rule-flyout">mocked component</div>
));

const mockKibana = () => {
  useKibanaMock.mockReturnValue({
    services: {
      ...kibanaStartMock.startContract(),
      triggersActionsUi: {
        ...triggersActionsUiMock.createStart(),
        getEditRuleFlyout: mockGetEditRuleFlyout,
      },
      cases: mockCases,
      http: mockHttp,
    },
  });
};

const mockRuleId = '123';
const mockRuleName = '456';

const mockUseFetchRuleWithData = () => {
  useFetchRuleMock.mockReturnValue({
    reloadRule: jest.fn(),
    rule: {
      id: mockRuleId,
      name: mockRuleName,
    },
  });
};
const mockUseFetchRuleWithoutData = () => {
  useFetchRuleMock.mockReturnValue({
    reloadRule: jest.fn(),
    rule: null,
  });
};

const mockOnUntrackAlert = () => {};

describe('Header Actions', () => {
  afterAll(() => {
    jest.clearAllMocks();
  });

  describe('Header Actions - Enabled', () => {
    beforeEach(() => {
      mockKibana();
      mockUseFetchRuleWithData();
    });

    it('should display an actions button', () => {
      const { queryByTestId } = render(
        <HeaderActions
          alert={alertWithGroupsAndTags}
          alertStatus={alertWithGroupsAndTags.fields[ALERT_STATUS] as AlertStatus}
          onUntrackAlert={mockOnUntrackAlert}
        />
      );
      expect(queryByTestId('alert-details-header-actions-menu-button')).toBeTruthy();
    });

    describe('when clicking the actions button', () => {
      it('should offer an "Add to case" button which opens the add to case modal', async () => {
        let attachments: any[] = [];

        const useCasesAddToExistingCaseModalMock: any = jest.fn().mockImplementation(() => ({
          open: ({ getAttachments }: { getAttachments: () => any[] }) => {
            attachments = getAttachments();
          },
        })) as CasesPublicStart['hooks']['useCasesAddToExistingCaseModal'];

        mockCases.hooks.useCasesAddToExistingCaseModal = useCasesAddToExistingCaseModalMock;

        const { getByTestId, findByTestId } = render(
          <HeaderActions
            alert={alertWithGroupsAndTags}
            alertIndex={'alert-index'}
            alertStatus={alertWithGroupsAndTags.fields[ALERT_STATUS] as AlertStatus}
            onUntrackAlert={mockOnUntrackAlert}
          />
        );

        fireEvent.click(await findByTestId('alert-details-header-actions-menu-button'));

        fireEvent.click(getByTestId('add-to-case-button'));

        expect(attachments).toEqual([
          {
            alertId: mockAlertUuid,
            index: 'alert-index',
            rule: {
              id: mockRuleId,
              name: mockRuleName,
            },
            type: 'alert',
          },
        ]);
      });

      it('should offer a "Edit rule" button which opens the edit rule flyout', async () => {
        const { getByTestId, findByTestId } = render(
          <HeaderActions
            alert={alertWithGroupsAndTags}
            alertStatus={alertWithGroupsAndTags.fields[ALERT_STATUS] as AlertStatus}
            onUntrackAlert={mockOnUntrackAlert}
          />
        );

        fireEvent.click(await findByTestId('alert-details-header-actions-menu-button'));
        fireEvent.click(await findByTestId('edit-rule-button'));
        expect(getByTestId('edit-rule-flyout')).toBeDefined();
      });

      it('should offer a "Mark as untracked" button which is enabled', async () => {
        const { queryByTestId, findByTestId } = render(
          <HeaderActions
            alert={alertWithGroupsAndTags}
            alertStatus={alertWithGroupsAndTags.fields[ALERT_STATUS] as AlertStatus}
            onUntrackAlert={mockOnUntrackAlert}
          />
        );

        fireEvent.click(await findByTestId('alert-details-header-actions-menu-button'));
        expect(queryByTestId('untrack-alert-button')).not.toHaveAttribute('disabled');
      });

      it('should offer a "Go to rule details" button which opens the rule details page in a new tab', async () => {
        const { queryByTestId, findByTestId } = render(
          <HeaderActions
            alert={alertWithGroupsAndTags}
            alertStatus={alertWithGroupsAndTags.fields[ALERT_STATUS] as AlertStatus}
            onUntrackAlert={mockOnUntrackAlert}
          />
        );

        fireEvent.click(await findByTestId('alert-details-header-actions-menu-button'));
        expect(queryByTestId('view-rule-details-button')).toHaveProperty(
          'href',
          `http://localhost/wow${OBSERVABILITY_BASE_PATH}${RULES_PATH}/${encodeURI(mockRuleId)}`
        );
        expect(queryByTestId('view-rule-details-button')).toHaveProperty('target', '_blank');
      });
    });
  });

  describe('Header Actions - Disabled', () => {
    beforeEach(() => {
      mockKibana();
      mockUseFetchRuleWithoutData();
    });

    it("should disable the 'Edit rule' when the rule is not available/deleted", async () => {
      const { queryByTestId, findByTestId } = render(
        <HeaderActions
          alert={alertWithGroupsAndTags}
          alertStatus={alertWithGroupsAndTags.fields[ALERT_STATUS] as AlertStatus}
          onUntrackAlert={mockOnUntrackAlert}
        />
      );

      fireEvent.click(await findByTestId('alert-details-header-actions-menu-button'));
      expect(queryByTestId('edit-rule-button')).toHaveAttribute('disabled');
    });

    it('should disable the "Mark as untracked" button when alert status is untracked', async () => {
      const { queryByTestId, findByTestId } = render(
        <HeaderActions
          alert={untrackedAlert}
          alertStatus={untrackedAlert.fields[ALERT_STATUS] as AlertStatus}
          onUntrackAlert={mockOnUntrackAlert}
        />
      );

      fireEvent.click(await findByTestId('alert-details-header-actions-menu-button'));
      expect(queryByTestId('untrack-alert-button')).toHaveAttribute('disabled');
    });

    it("should disable the 'View rule details' when the rule is not available/deleted", async () => {
      const { queryByTestId, findByTestId } = render(
        <HeaderActions
          alert={alertWithGroupsAndTags}
          alertStatus={alertWithGroupsAndTags.fields[ALERT_STATUS] as AlertStatus}
          onUntrackAlert={mockOnUntrackAlert}
        />
      );
      fireEvent.click(await findByTestId('alert-details-header-actions-menu-button'));
      expect(queryByTestId('view-rule-details-button')).toHaveAttribute('disabled');
    });
  });
});
