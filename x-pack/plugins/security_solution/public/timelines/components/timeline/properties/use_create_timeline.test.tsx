/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor } from '@testing-library/react';

import { renderHook, act } from '@testing-library/react-hooks';
import { mount, shallow } from 'enzyme';

import { TimelineType } from '../../../../../common/types/timeline';
import { TestProviders } from '../../../../common/mock';
import { useCreateTimelineButton } from './use_create_timeline';

const mockDispatch = jest.fn();

jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux');
  return {
    ...actual,
    useDispatch: () => mockDispatch,
  };
});

describe('useCreateTimelineButton', () => {
  const mockId = 'mockId';
  const timelineType = TimelineType.default;
  const wrapperContainer: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
    <TestProviders>{children}</TestProviders>
  );

  test('return getButton', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(
        () => useCreateTimelineButton({ timelineId: mockId, timelineType }),
        { wrapper: wrapperContainer }
      );
      await waitForNextUpdate();

      expect(result.current.getButton).toBeTruthy();
    });
  });

  test('getButton renders correct outline - EuiButton', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(
        () => useCreateTimelineButton({ timelineId: mockId, timelineType }),
        { wrapper: wrapperContainer }
      );
      await waitForNextUpdate();

      const button = result.current.getButton({ outline: true, title: 'mock title' });
      const wrapper = shallow(button);
      expect(wrapper.find('[data-test-subj="timeline-new-with-border"]').exists()).toBeTruthy();
    });
  });

  test('getButton renders correct iconType - EuiButton', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(
        () => useCreateTimelineButton({ timelineId: mockId, timelineType }),
        { wrapper: wrapperContainer }
      );
      await waitForNextUpdate();

      const button = result.current.getButton({
        outline: true,
        title: 'mock title',
        iconType: 'pencil',
      });
      const wrapper = shallow(button);
      expect(wrapper.find('[data-test-subj="timeline-new-with-border"]').prop('iconType')).toEqual(
        'pencil'
      );
    });
  });

  test('getButton renders correct filling - EuiButton', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(
        () => useCreateTimelineButton({ timelineId: mockId, timelineType }),
        { wrapper: wrapperContainer }
      );
      await waitForNextUpdate();

      const button = result.current.getButton({
        outline: true,
        title: 'mock title',
        fill: false,
      });
      const wrapper = shallow(button);
      expect(wrapper.find('[data-test-subj="timeline-new-with-border"]').prop('fill')).toEqual(
        false
      );
    });
  });

  test('getButton renders correct outline - EuiButtonEmpty', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(
        () => useCreateTimelineButton({ timelineId: mockId, timelineType }),
        { wrapper: wrapperContainer }
      );
      await waitForNextUpdate();

      const button = result.current.getButton({ outline: false, title: 'mock title' });
      const wrapper = shallow(button);
      expect(wrapper.find('[data-test-subj="timeline-new"]').exists()).toBeTruthy();
    });
  });

  test('Make sure that timeline reset to the global date picker', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(
        () => useCreateTimelineButton({ timelineId: mockId, timelineType }),
        { wrapper: wrapperContainer }
      );

      await waitForNextUpdate();
      const button = result.current.getButton({ outline: false, title: 'mock title' });
      await waitFor(() => {
        const wrapper = mount(button);
        wrapper.update();

        wrapper.find('[data-test-subj="timeline-new"]').first().simulate('click');

        expect(mockDispatch.mock.calls[0][0].type).toEqual(
          'x-pack/security_solution/local/sourcerer/SET_SELECTED_DATA_VIEW'
        );
        expect(mockDispatch.mock.calls[1][0].type).toEqual(
          'x-pack/security_solution/local/timeline/CREATE_TIMELINE'
        );
        expect(mockDispatch.mock.calls[2][0].type).toEqual(
          'x-pack/security_solution/local/inputs/ADD_GLOBAL_LINK_TO'
        );
        expect(mockDispatch.mock.calls[3][0].type).toEqual(
          'x-pack/security_solution/local/inputs/ADD_TIMELINE_LINK_TO'
        );
        expect(mockDispatch.mock.calls[4][0].type).toEqual(
          'x-pack/security_solution/local/app/ADD_NOTE'
        );
        expect(mockDispatch.mock.calls[5][0].type).toEqual(
          'x-pack/security_solution/local/inputs/SET_RELATIVE_RANGE_DATE_PICKER'
        );
      });
    });
  });
});
