/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import * as reactTestingLibrary from '@testing-library/react';

import { PolicyList } from './index';
import { mockPolicyResultList } from '../store/policy_list/mock_policy_result_list';
import { AppContextTestRender, createAppRootMockRenderer } from '../../../../common/mock/endpoint';
import { AppAction } from '../../../../common/store/actions';

jest.mock('../../../../common/components/link_to');

describe('when on the policies page', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let history: AppContextTestRender['history'];
  let store: AppContextTestRender['store'];

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();
    ({ history, store } = mockedContext);
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

  it('should display the onboarding steps', async () => {
    const renderResult = render();
    const onboardingSteps = await renderResult.findByTestId('onboardingSteps');
    expect(onboardingSteps).not.toBeNull();
  });

  describe('when list data loads', () => {
    let firstPolicyID: string;
    beforeEach(() => {
      reactTestingLibrary.act(() => {
        history.push('/policy');
        reactTestingLibrary.act(() => {
          const policyListData = mockPolicyResultList({ total: 3 });
          firstPolicyID = policyListData.items[0].id;
          const action: AppAction = {
            type: 'serverReturnedPolicyListData',
            payload: {
              policyItems: policyListData.items,
              total: policyListData.total,
              pageSize: policyListData.perPage,
              pageIndex: policyListData.page,
            },
          };
          store.dispatch(action);
        });
      });
    });

    it('should display rows in the table', async () => {
      const renderResult = render();
      const rows = await renderResult.findAllByRole('row');
      expect(rows).toHaveLength(4);
    });

    it('should display policy name value as a link', async () => {
      const renderResult = render();
      const policyNameLink = (await renderResult.findAllByTestId('policyNameLink'))[0];
      expect(policyNameLink).not.toBeNull();
      expect(policyNameLink.getAttribute('href')).toContain(`policy/${firstPolicyID}`);
    });
  });
});
