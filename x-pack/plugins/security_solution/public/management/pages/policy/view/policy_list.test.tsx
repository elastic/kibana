/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { PolicyList } from './index';
import '../../../../common/mock/match_media.ts';
import { AppContextTestRender, createAppRootMockRenderer } from '../../../../common/mock/endpoint';
import { setPolicyListApiMockImplementation } from '../store/policy_list/test_mock_utils';

jest.mock('../../../../common/components/link_to');

// Skipping these test now that the Policy List has been hidden
describe.skip('when on the policies page', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let history: AppContextTestRender['history'];
  let coreStart: AppContextTestRender['coreStart'];
  let middlewareSpy: AppContextTestRender['middlewareSpy'];

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();
    ({ history, coreStart, middlewareSpy } = mockedContext);
    render = () => mockedContext.render(<PolicyList />);
  });

  it('should NOT display timeline', async () => {
    const renderResult = render();
    const timelineFlyout = await renderResult.queryByTestId('flyoutOverlay');
    expect(timelineFlyout).toBeNull();
  });

  it('should show the empty state', async () => {
    const renderResult = render();
    const table = await renderResult.findByTestId('emptyPolicyTable');
    expect(table).not.toBeNull();
  });

  it('should display the instructions', async () => {
    const renderResult = render();
    const onboardingSteps = await renderResult.findByTestId('policyOnboardingInstructions');
    expect(onboardingSteps).not.toBeNull();
  });

  describe('when list data loads', () => {
    let firstPolicyID: string;
    const renderList = async () => {
      const renderResult = render();
      history.push('/policy');
      await Promise.all([
        middlewareSpy
          .waitForAction('serverReturnedPolicyListData')
          .then((action) => (firstPolicyID = action.payload.policyItems[0].id)),
        // middlewareSpy.waitForAction('serverReturnedAgentPolicyListData'),
      ]);
      return renderResult;
    };

    beforeEach(async () => {
      setPolicyListApiMockImplementation(coreStart.http, 3);
    });

    it('should display rows in the table', async () => {
      const renderResult = await renderList();
      const rows = await renderResult.findAllByRole('row');
      expect(rows).toHaveLength(4);
    });

    it('should display policy name value as a link', async () => {
      const renderResult = await renderList();
      const policyNameLink = (await renderResult.findAllByTestId('policyNameLink'))[0];
      expect(policyNameLink).not.toBeNull();
      expect(policyNameLink.getAttribute('href')).toContain(`policy/${firstPolicyID}`);
    });
  });
});
