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

jest.mock('../use_insert_timeline');

const useInsertTimelineMock = useInsertTimeline as jest.Mock;

describe('Create case', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(routeData, 'useLocation').mockReturnValue(mockLocation);
  });

  it('it renders', async () => {
    const wrapper = mount(
      <TestProviders>
        <Router history={mockHistory}>
          <Create />
        </Router>
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj="create-case-submit"]`).exists()).toBeTruthy();
    expect(wrapper.find(`[data-test-subj="create-case-cancel"]`).exists()).toBeTruthy();
  });

  it('should redirect to all cases on cancel click', async () => {
    const wrapper = mount(
      <TestProviders>
        <Router history={mockHistory}>
          <Create />
        </Router>
      </TestProviders>
    );

    wrapper.find(`[data-test-subj="create-case-cancel"]`).first().simulate('click');
    await waitFor(() => expect(mockHistory.push).toHaveBeenCalledWith('/'));
  });

  it('should redirect to new case when posting the case', async () => {
    const wrapper = mount(
      <TestProviders>
        <Router history={mockHistory}>
          <Create />
        </Router>
      </TestProviders>
    );

    wrapper.find(`[data-test-subj="create-case-submit"]`).first().simulate('click');

    await waitFor(() => expect(mockHistory.push).toHaveBeenNthCalledWith(1, '/basic-case-id'));
  });

  it('it should insert a timeline', async () => {
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
