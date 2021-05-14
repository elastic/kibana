/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { AllCasesGeneric } from './all_cases_generic';

import { TestProviders } from '../../common/mock';
import { useGetTags } from '../../containers/use_get_tags';
import { useGetReporters } from '../../containers/use_get_reporters';
import { useGetActionLicense } from '../../containers/use_get_action_license';
import { StatusAll } from '../../containers/types';
import { CaseStatuses, SECURITY_SOLUTION_OWNER } from '../../../common';
import { act } from 'react-dom/test-utils';

jest.mock('../../containers/use_get_reporters');
jest.mock('../../containers/use_get_tags');
jest.mock('../../containers/use_get_action_license');
jest.mock('../../containers/api');

const createCaseNavigation = { href: '', onClick: jest.fn() };

const alertDataMock = {
  type: 'alert',
  rule: {
    id: 'rule-id',
    name: 'rule',
  },
  index: 'index-id',
  alertId: 'alert-id',
  owner: SECURITY_SOLUTION_OWNER,
};

describe('AllCasesGeneric ', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (useGetTags as jest.Mock).mockReturnValue({ tags: ['coke', 'pepsi'], fetchTags: jest.fn() });
    (useGetReporters as jest.Mock).mockReturnValue({
      reporters: ['casetester'],
      respReporters: [{ username: 'casetester' }],
      isLoading: true,
      isError: false,
      fetchReporters: jest.fn(),
    });
    (useGetActionLicense as jest.Mock).mockReturnValue({
      actionLicense: null,
      isLoading: false,
    });
  });

  it('renders the first available status when hiddenStatus is given', () =>
    act(async () => {
      const wrapper = mount(
        <TestProviders>
          <AllCasesGeneric
            alertData={alertDataMock}
            createCaseNavigation={createCaseNavigation}
            hiddenStatuses={[StatusAll, CaseStatuses.open]}
            isSelectorView={true}
            userCanCrud={true}
          />
        </TestProviders>
      );

      expect(wrapper.find(`[data-test-subj="status-badge-in-progress"]`).exists()).toBeTruthy();
    }));
});
