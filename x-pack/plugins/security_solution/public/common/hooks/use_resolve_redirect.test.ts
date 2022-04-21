/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLocation } from 'react-router-dom';
import { renderHook } from '@testing-library/react-hooks';
import { useDeepEqualSelector } from './use_selector';
import { useKibana } from '../lib/kibana';
import { useResolveRedirect } from './use_resolve_redirect';
import * as urlHelpers from '../components/url_state/helpers';

jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');

  return {
    ...original,
    useLocation: jest.fn(),
  };
});
jest.mock('../lib/kibana');
jest.mock('./use_selector');
jest.mock('../../timelines/store/timeline', () => ({
  timelineSelectors: {
    getTimelineByIdSelector: () => jest.fn(),
  },
}));

describe('useResolveRedirect', () => {
  const mockRedirectLegacyUrl = jest.fn();
  beforeEach(() => {
    jest.resetAllMocks();
    // Mock rison format in actual url
    (useLocation as jest.Mock).mockReturnValue({
      pathname: 'my/cool/path',
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
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('resolve object is not provided', () => {
    it('should not redirect', async () => {
      (useDeepEqualSelector as jest.Mock).mockImplementation(() => ({
        savedObjectId: 'current-saved-object-id',
        activeTab: 'some-tab',
        graphEventId: 'current-graph-event-id',
        show: false,
      }));
      renderHook(() => useResolveRedirect());
      expect(mockRedirectLegacyUrl).not.toHaveBeenCalled();
    });
  });

  describe('outcome is exactMatch', () => {
    it('should not redirect', async () => {
      (useDeepEqualSelector as jest.Mock).mockImplementation(() => ({
        resolveTimelineConfig: {
          outcome: 'exactMatch',
        },
        savedObjectId: 'current-saved-object-id',
        activeTab: 'some-tab',
        graphEventId: 'current-graph-event-id',
        show: false,
      }));
      renderHook(() => useResolveRedirect());
      expect(mockRedirectLegacyUrl).not.toHaveBeenCalled();
    });
  });

  describe('outcome is aliasMatch', () => {
    it('should redirect to url with id:new-id if outcome is aliasMatch', async () => {
      (useDeepEqualSelector as jest.Mock).mockImplementation(() => ({
        resolveTimelineConfig: {
          outcome: 'aliasMatch',
          alias_target_id: 'new-id',
          alias_purpose: 'savedObjectConversion',
        },
      }));
      renderHook(() => useResolveRedirect());
      expect(mockRedirectLegacyUrl).toHaveBeenCalledWith({
        path: 'my/cool/path?timeline=%28activeTab%3Aquery%2CgraphEventId%3A%27%27%2Cid%3Anew-id%2CisOpen%3A%21t%29',
        aliasPurpose: 'savedObjectConversion',
        objectNoun: 'timeline',
      });
    });

    describe('rison is unable to be decoded', () => {
      it('should use timeline values from redux to create the redirect path', async () => {
        jest.spyOn(urlHelpers, 'decodeRisonUrlState').mockImplementation(() => {
          throw new Error('Unable to decode');
        });
        (useLocation as jest.Mock).mockReturnValue({
          pathname: 'my/cool/path',
          search: '?foo=bar',
        });
        (useDeepEqualSelector as jest.Mock).mockImplementation(() => ({
          resolveTimelineConfig: {
            outcome: 'aliasMatch',
            alias_target_id: 'new-id',
            alias_purpose: 'savedObjectConversion',
          },
          savedObjectId: 'current-saved-object-id',
          activeTab: 'some-tab',
          graphEventId: 'current-graph-event-id',
          show: false,
        }));
        renderHook(() => useResolveRedirect());
        expect(mockRedirectLegacyUrl).toHaveBeenCalledWith({
          path: 'my/cool/path?foo=bar&timeline=%28activeTab%3Asome-tab%2CgraphEventId%3Acurrent-graph-event-id%2Cid%3Anew-id%2CisOpen%3A%21f%29',
          aliasPurpose: 'savedObjectConversion',
          objectNoun: 'timeline',
        });
      });
    });
  });

  describe('outcome is conflict', () => {
    it('should not redirect', async () => {
      (useDeepEqualSelector as jest.Mock).mockImplementation(() => ({
        resolveTimelineConfig: {
          outcome: 'conflict',
          alias_target_id: 'new-id',
        },
      }));
      renderHook(() => useResolveRedirect());
      expect(mockRedirectLegacyUrl).not.toHaveBeenCalled();
    });
  });
});
