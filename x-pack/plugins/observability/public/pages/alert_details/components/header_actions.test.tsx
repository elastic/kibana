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
import { alertWithTags, mockAlertUuid } from '../mock/alert';
import { useFetchRule } from '../../../hooks/use_fetch_rule';

import { HeaderActions } from './header_actions';
import { CasesUiStart } from '@kbn/cases-plugin/public';

jest.mock('../../../utils/kibana_react');
jest.mock('../../../hooks/use_fetch_rule');

const useKibanaMock = useKibana as jest.Mock;
const useFetchRuleMock = useFetchRule as jest.Mock;
const mockCases = casesPluginMock.createStartContract();

const mockKibana = () => {
  useKibanaMock.mockReturnValue({
    services: {
      ...kibanaStartMock.startContract(),
      triggersActionsUi: triggersActionsUiMock.createStart(),
      cases: mockCases,
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
      const { queryByTestId } = render(<HeaderActions alert={alertWithTags} />);
      expect(queryByTestId('alert-details-header-actions-menu-button')).toBeTruthy();
    });

    describe('when clicking the actions button', () => {
      it('should offer an "add to case" button which opens the add to case modal', async () => {
        let attachments: any[] = [];

        const useCasesAddToExistingCaseModalMock: any = jest.fn().mockImplementation(() => ({
          open: ({ getAttachments }: { getAttachments: () => any[] }) => {
            attachments = getAttachments();
          },
        })) as CasesUiStart['hooks']['useCasesAddToExistingCaseModal'];

        mockCases.hooks.useCasesAddToExistingCaseModal = useCasesAddToExistingCaseModalMock;

        const { getByTestId, findByRole } = render(<HeaderActions alert={alertWithTags} />);

        fireEvent.click(await findByRole('button', { name: 'Actions' }));

        fireEvent.click(getByTestId('add-to-case-button'));

        expect(attachments).toEqual([
          {
            alertId: mockAlertUuid,
            index: '.internal.alerts-observability.metrics.alerts-*',
            rule: {
              id: mockRuleId,
              name: mockRuleName,
            },
            type: 'alert',
          },
        ]);
      });
    });
  });
  describe('Header Actions - Disabled', () => {
    beforeEach(() => {
      mockKibana();
      mockUseFetchRuleWithoutData();
    });
    it("should disable the 'View rule details' when the rule is not available/delete", async () => {
      const { queryByTestId, findByRole } = render(<HeaderActions alert={alertWithTags} />);
      fireEvent.click(await findByRole('button', { name: 'Actions' }));
      expect(queryByTestId('view-rule-details-button')).toHaveAttribute('disabled');
    });
  });
});
