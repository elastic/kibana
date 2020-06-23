/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { renderHook, act } from '@testing-library/react-hooks';
import { shallow } from 'enzyme';

import { TimelineType } from '../../../../../common/types/timeline';
import { useCreateTimelineButton } from './use_create_timeline';

jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux');
  return {
    ...actual,
    useDispatch: jest.fn(),
  };
});

describe('useCreateTimelineButton', () => {
  const mockId = 'mockId';
  const timelineType = TimelineType.default;

  test('return getButton', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() =>
        useCreateTimelineButton({ timelineId: mockId, timelineType })
      );
      await waitForNextUpdate();

      expect(result.current.getButton).toBeTruthy();
    });
  });

  test('getButton renders correct outline - EuiButton', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() =>
        useCreateTimelineButton({ timelineId: mockId, timelineType })
      );
      await waitForNextUpdate();

      const button = result.current.getButton({ outline: true, title: 'mock title' });
      const wrapper = shallow(button);
      expect(wrapper.find('[data-test-subj="timeline-new-with-border"]').exists()).toBeTruthy();
    });
  });

  test('getButton renders correct outline - EuiButtonEmpty', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() =>
        useCreateTimelineButton({ timelineId: mockId, timelineType })
      );
      await waitForNextUpdate();

      const button = result.current.getButton({ outline: false, title: 'mock title' });
      const wrapper = shallow(button);
      expect(wrapper.find('[data-test-subj="timeline-new"]').exists()).toBeTruthy();
    });
  });
});
