/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLocation } from 'react-router-dom';
import { renderHook } from '@testing-library/react-hooks';
import { useDeepEqualSelector } from '../../common/hooks/use_selector';
import { useKibana } from '../../common/lib/kibana';
import { useTimelineLoad } from '../utils/timeline/use_timeline_load';
import { useResolveRedirect } from './use_resolve_redirect';
import { useAppToasts } from './use_app_toasts';

jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');

  return {
    ...original,
    useLocation: jest.fn(),
  };
});
jest.mock('./use_app_toasts');
jest.mock('../utils/timeline/use_timeline_load');
jest.mock('../../common/lib/kibana');
jest.mock('../../common/hooks/use_selector');
jest.mock('../../timelines/store/timeline/', () => ({
  timelineSelectors: {
    getTimelineByIdSelector: () => jest.fn(),
  },
}));

describe('useResolveRedirect', () => {
  const mockRedirectLegacyUrl = jest.fn();
  const mockLoadTimeline = jest.fn();
  beforeEach(() => {
    jest.resetAllMocks();
    (useAppToasts as jest.Mock).mockReturnValue({
      addError: jest.fn(),
    });
    // Mock rison format in actual url
    (useLocation as jest.Mock).mockReturnValue({
      pathname: 'app/security/timelines/default',
      search:
        'timeline=(activeTab:query,graphEventId:%27%27,id:%2704e8ffb0-2c2a-11ec-949c-39005af91f70%27,isOpen:!t)',
    });
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        spaces: {
          ui: {
            redirectLegacyUrl: mockRedirectLegacyUrl,
          },
        },
        http: {
          basePath: {
            prepend: jest.fn().mockImplementation((newPath) => {
              return `base-path.com/${newPath}`;
            }),
          },
        },
      },
    });
    (useTimelineLoad as jest.Mock).mockReturnValue(mockLoadTimeline);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should not redirect if resolve outcome is not aliasMatch', async () => {
    (useDeepEqualSelector as jest.Mock).mockImplementation(() => ({
      resolveTimelineConfig: {
        outcome: 'exactMatch',
      },
      savedObjectId: '123',
      activeTab: 'some-tab',
      graphEventId: '987',
      show: false,
    }));
    renderHook(() => useResolveRedirect());
    expect(mockRedirectLegacyUrl).not.toHaveBeenCalled();
    expect(mockLoadTimeline).not.toHaveBeenCalled();
  });

  it('should redirect if outcome is aliasMatch', async () => {
    (useDeepEqualSelector as jest.Mock).mockImplementation(() => ({
      resolveTimelineConfig: {
        outcome: 'aliasMatch',
        alias_target_id: 'new-id',
      },
    }));
    renderHook(() => useResolveRedirect());
    expect(mockRedirectLegacyUrl).toHaveBeenCalledWith(
      'base-path.com/app/security/timelines/default?timeline=%28activeTab%3Aquery%2CgraphEventId%3A%27%27%2Cid%3Anew-id%2CisOpen%3A%21t%29',
      'timeline'
    );
    expect(mockLoadTimeline).toHaveBeenCalledWith('new-id', expect.any(Function));
  });

  it('should use timeline values from redux if the url search value is unable to be parsed', async () => {
    (useLocation as jest.Mock).mockReturnValue({
      pathname: 'app/security/timelines/default',
      search: 'blarfblarghen',
    });
    (useDeepEqualSelector as jest.Mock).mockImplementation(() => ({
      resolveTimelineConfig: {
        outcome: 'aliasMatch',
        alias_target_id: 'new-id',
      },
      savedObjectId: '123',
      activeTab: 'some-tab',
      graphEventId: '987',
      show: false,
    }));
    renderHook(() => useResolveRedirect());
    expect(mockRedirectLegacyUrl).toHaveBeenCalledWith(
      'base-path.com/app/security/timelines/default?blarfblarghen=&timeline=%28id%3Anew-id%29',
      'timeline'
    );
    expect(mockLoadTimeline).toHaveBeenCalledWith('new-id', expect.any(Function));
  });
});
