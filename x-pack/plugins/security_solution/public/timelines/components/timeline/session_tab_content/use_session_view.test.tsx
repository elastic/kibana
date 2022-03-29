/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';

import { renderHook } from '@testing-library/react-hooks';
import { TimelineId } from '../../../../../common/types/timeline';
import { mockTimelineModel } from '../../../../common/mock';
import { useKibana } from '../../../../common/lib/kibana';
import {
  useTimelineFullScreen,
  useGlobalFullScreen,
} from '../../../../common/containers/use_full_screen';
import { useSessionView } from './use_session_view';

const mockDispatch = jest.fn();
jest.mock('../../../../common/hooks/use_selector', () => ({
  useDeepEqualSelector: () => {
    return 'test';
  },
  useShallowEqualSelector: () => mockTimelineModel,
}));

jest.mock('../../../../common/containers/use_full_screen');

jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');

  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});
jest.mock('../../../../common/lib/kibana', () => {
  const originalModule = jest.requireActual('../../../../common/lib/kibana');
  return {
    ...originalModule,
    useKibana: jest.fn().mockReturnValue({
      services: {
        application: {
          navigateToApp: jest.fn(),
          getUrlForApp: jest.fn(),
          capabilities: {
            siem: { crud_alerts: true, read_alerts: true },
          },
        },
        sessionView: {
          getSessionView: jest.fn().mockReturnValue(<div />),
        },
        data: {
          search: jest.fn(),
          query: jest.fn(),
        },
        uiSettings: {
          get: jest.fn(),
        },
        savedObjects: {
          client: {},
        },
        timelines: {
          getLastUpdated: jest.fn(),
          getLoadingPanel: jest.fn(),
          getFieldBrowser: jest.fn(),
          getUseDraggableKeyboardWrapper: () =>
            jest.fn().mockReturnValue({
              onBlur: jest.fn(),
              onKeyDown: jest.fn(),
            }),
        },
      },
    }),
  };
});
jest.mock('../../side_panel/hooks/use_detail_panel', () => {
  return {
    useDetailPanel: () => ({
      openDetailsPanel: () => {},
      handleOnDetailsPanelClosed: () => {},
      DetailsPanel: () => <div />,
      shouldShowDetailsPanel: false,
    }),
  };
});

describe('useSessionView', () => {
  let setTimelineFullScreen: jest.Mock;
  let setGlobalFullScreen: jest.Mock;
  let kibana: ReturnType<typeof useKibana>;
  const Wrapper = memo(({ children }) => {
    kibana = useKibana();
    return <>{children}</>;
  });
  Wrapper.displayName = 'Wrapper';

  beforeEach(() => {
    setTimelineFullScreen = jest.fn();
    setGlobalFullScreen = jest.fn();
    (useTimelineFullScreen as jest.Mock).mockImplementation(() => ({
      setTimelineFullScreen,
    }));
    (useGlobalFullScreen as jest.Mock).mockImplementation(() => ({
      setGlobalFullScreen,
    }));
  });

  it('removes the full screen class from the overlay', () => {
    renderHook(
      () => {
        const testProps = {
          timelineId: TimelineId.active,
        };
        return useSessionView(testProps);
      },
      { wrapper: Wrapper }
    );
    expect(kibana.services.sessionView.getSessionView).toHaveBeenCalled();
  });

  it('calls setTimelineFullScreen with false when onCloseOverlay is called and the app is not in full screen mode', () => {
    const { result } = renderHook(
      () => {
        const testProps = {
          timelineId: TimelineId.active,
        };
        return useSessionView(testProps);
      },
      { wrapper: Wrapper }
    );
    result.current.onCloseOverlay();

    expect(setTimelineFullScreen).toBeCalledWith(false);
  });
});
