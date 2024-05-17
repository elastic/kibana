/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseUiClientMock } from '@kbn/cases-plugin/public/mocks';
import { casesPluginMock } from '@kbn/cases-plugin/public/mocks';
import { waitFor } from '@testing-library/react';
import { mount } from 'enzyme';
import React from 'react';
import { noCasesPermissions, readCasesPermissions } from '../../../cases_test_utils';
import { useKibana } from '../../../common/lib/kibana';
import { TestProviders } from '../../../common/mock';
import { Sidebar } from './sidebar';

jest.mock('../../../common/lib/kibana');

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;

describe('Sidebar', () => {
  let casesMock: CaseUiClientMock;

  beforeEach(() => {
    casesMock = casesPluginMock.createStartContract();
    casesMock.ui.getRecentCases.mockImplementation(() => <>{'test'}</>);
    useKibanaMock.mockReturnValue({
      services: {
        cases: casesMock,
        application: {
          // these are needed by the RecentCases component if it is rendered.
          navigateToApp: jest.fn(),
          getUrlForApp: jest.fn(() => ''),
        },
      },
    } as unknown as ReturnType<typeof useKibana>);
  });

  it('does not render the recently created cases section when the user does not have read permissions', async () => {
    casesMock.helpers.canUseCases.mockReturnValue(noCasesPermissions());

    await waitFor(() =>
      mount(
        <TestProviders>
          <Sidebar recentTimelinesFilterBy={'favorites'} setRecentTimelinesFilterBy={() => {}} />
        </TestProviders>
      )
    );

    expect(casesMock.ui.getRecentCases).not.toHaveBeenCalled();
  });

  it('does render the recently created cases section when the user has read permissions', async () => {
    casesMock.helpers.canUseCases.mockReturnValue(readCasesPermissions());

    await waitFor(() =>
      mount(
        <TestProviders>
          <Sidebar recentTimelinesFilterBy={'favorites'} setRecentTimelinesFilterBy={() => {}} />
        </TestProviders>
      )
    );

    expect(casesMock.ui.getRecentCases).toHaveBeenCalled();
  });
});
