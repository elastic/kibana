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
import { Router, routeData, mockHistory, mockLocation } from '../__mock__/router';
import { useInsertTimeline } from '../use_insert_timeline';
import { Create } from '.';
import { useKibana } from '../../../common/lib/kibana';
import { Case } from '../../../../../cases/public/containers/types';
import { basicCase } from '../../../../../cases/public/containers/mock';

jest.mock('../use_insert_timeline');
jest.mock('../../../common/lib/kibana');

const useInsertTimelineMock = useInsertTimeline as jest.Mock;

describe('Create case', () => {
  const mockCreateCase = jest.fn();
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(routeData, 'useLocation').mockReturnValue(mockLocation);
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        cases: {
          getCreateCase: mockCreateCase,
        },
      },
    });
  });

  it('it renders', () => {
    mount(
      <TestProviders>
        <Router history={mockHistory}>
          <Create />
        </Router>
      </TestProviders>
    );

    expect(mockCreateCase).toHaveBeenCalled();
  });

  it('should redirect to all cases on cancel click', async () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        cases: {
          getCreateCase: ({ onCancel }: { onCancel: () => Promise<void> }) => {
            onCancel();
          },
        },
      },
    });
    mount(
      <TestProviders>
        <Router history={mockHistory}>
          <Create />
        </Router>
      </TestProviders>
    );

    await waitFor(() => expect(mockHistory.push).toHaveBeenCalledWith('/'));
  });

  it('should redirect to new case when posting the case', async () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        cases: {
          getCreateCase: ({ onSuccess }: { onSuccess: (theCase: Case) => Promise<void> }) => {
            onSuccess(basicCase);
          },
        },
      },
    });
    mount(
      <TestProviders>
        <Router history={mockHistory}>
          <Create />
        </Router>
      </TestProviders>
    );

    await waitFor(() => expect(mockHistory.push).toHaveBeenNthCalledWith(1, '/basic-case-id'));
  });

  it.skip('it should insert a timeline', async () => {
    let attachTimeline = noop;
    useInsertTimelineMock.mockImplementation((value, onTimelineAttached) => {
      attachTimeline = onTimelineAttached;
    });

    const wrapper = mount(
      <TestProviders>
        <Router history={mockHistory}>
          <Create />
        </Router>
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
