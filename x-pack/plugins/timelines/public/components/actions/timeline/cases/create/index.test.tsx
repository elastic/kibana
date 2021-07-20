/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { act, waitFor } from '@testing-library/react';
import { noop } from 'lodash/fp';

import { TestProviders } from '../../../../../mock';
import { useInsertTimeline } from '../../../../../hooks/use_insert_timeline';
import { TimelinesStartServices } from '../../../../../types';
import { Create } from '.';
import { useKibana } from '../../../../../../../../../src/plugins/kibana_react/public';
import type { Case } from '../../../../../../../cases/common';
import { basicCase } from '../../../../../../../cases/public/containers/mock';
import { APP_ID, SecurityPageName } from '../add_to_case_action';

jest.mock('../../../../../hooks/use_insert_timeline');

const useInsertTimelineMock = useInsertTimeline as jest.Mock;
const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('Create case', () => {
  const mockCreateCase = jest.fn();
  const mockNavigateToApp = jest.fn();
  const mockGetUrlForApp = jest.fn();
  const mockAllCasesModal = jest.fn();

  const mockRes = 'coolstring';
  beforeEach(() => {
    jest.resetAllMocks();
    useKibanaMock<TimelinesStartServices>().services.application.navigateToApp = mockNavigateToApp;
    useKibanaMock<TimelinesStartServices>().services.application.getUrlForApp = mockGetUrlForApp;
    useKibanaMock<TimelinesStartServices>().services.cases = {
      getAllCases: jest.fn(),
      getCaseView: jest.fn(),
      getConfigureCases: jest.fn(),
      getRecentCases: jest.fn(),
      getCreateCase: mockCreateCase,
      getAllCasesSelectorModal: mockAllCasesModal.mockImplementation(() => <>{'test'}</>),
    };
  });

  it('it renders', () => {
    mount(
      <TestProviders>
        <Create />
      </TestProviders>
    );

    expect(mockCreateCase).toHaveBeenCalled();
    expect(mockCreateCase.mock.calls[0][0].owner).toEqual([APP_ID]);
  });

  it('should redirect to all cases on cancel click', async () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        cases: {
          getCreateCase: ({ onCancel }: { onCancel: () => Promise<void> }) => {
            onCancel();
          },
        },
        application: { navigateToApp: mockNavigateToApp },
      },
    });
    mount(
      <TestProviders>
        <Create />
      </TestProviders>
    );

    await waitFor(() =>
      expect(mockNavigateToApp).toHaveBeenCalledWith(APP_ID, {
        path: `?${mockRes}`,
        deepLinkId: SecurityPageName.case,
      })
    );
  });

  it('should redirect to new case when posting the case', async () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        cases: {
          getCreateCase: ({ onSuccess }: { onSuccess: (theCase: Case) => Promise<void> }) => {
            onSuccess(basicCase);
          },
        },
        application: { navigateToApp: mockNavigateToApp, getUrlForApp: mockGetUrlForApp },
      },
    });
    mount(
      <TestProviders>
        <Create />
      </TestProviders>
    );

    await waitFor(() =>
      expect(mockNavigateToApp).toHaveBeenNthCalledWith(1, APP_ID, {
        path: `/basic-case-id?${mockRes}`,
        deepLinkId: SecurityPageName.case,
      })
    );
  });

  it.skip('it should insert a timeline', async () => {
    let attachTimeline = noop;
    useInsertTimelineMock.mockImplementation((value, onTimelineAttached) => {
      attachTimeline = onTimelineAttached;
    });

    const wrapper = mount(
      <TestProviders>
        <Create />
      </TestProviders>
    );

    act(() => {
      attachTimeline('[title](url)');
    });

    await waitFor(() => {
      expect(wrapper.find(`[data-test-subj="caseDescription"] textarea`).text()).toBe(
        '[title](url)'
      );
    });
  });
});
