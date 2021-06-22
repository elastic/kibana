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

import { TestProviders } from '../../../common/mock';
import { useInsertTimeline } from '../use_insert_timeline';
import { Create } from '.';
import { useKibana } from '../../../common/lib/kibana';
import { Case } from '../../../../../cases/public/containers/types';
import { basicCase } from '../../../../../cases/public/containers/mock';
import { APP_ID, CASES_APP_ID } from '../../../../common/constants';
import { useGetUrlSearch } from '../../../common/components/navigation/use_get_url_search';

jest.mock('../use_insert_timeline');
jest.mock('../../../common/lib/kibana');
jest.mock('../../../common/components/navigation/use_get_url_search');

const useInsertTimelineMock = useInsertTimeline as jest.Mock;

describe('Create case', () => {
  const mockCreateCase = jest.fn();
  const mockNavigateToApp = jest.fn();
  const mockRes = 'coolstring';
  const mockCasesUrl = 'https://elastic.co/app/security/cases';
  const mockApplication = { navigateToApp: mockNavigateToApp, getUrlForApp: () => mockCasesUrl };
  beforeEach(() => {
    jest.resetAllMocks();
    (useGetUrlSearch as jest.Mock).mockReturnValue(mockRes);
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        cases: {
          getCreateCase: mockCreateCase,
        },
        application: mockApplication,
      },
    });
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
        application: mockApplication,
      },
    });
    mount(
      <TestProviders>
        <Create />
      </TestProviders>
    );

    await waitFor(() =>
      expect(mockNavigateToApp).toHaveBeenCalledWith(CASES_APP_ID, {
        path: `?${mockRes}`,
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
        application: mockApplication,
      },
    });
    mount(
      <TestProviders>
        <Create />
      </TestProviders>
    );

    await waitFor(() =>
      expect(mockNavigateToApp).toHaveBeenNthCalledWith(1, CASES_APP_ID, {
        path: `/basic-case-id?${mockRes}`,
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
