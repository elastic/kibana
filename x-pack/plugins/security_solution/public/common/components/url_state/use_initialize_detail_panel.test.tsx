/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLocation } from 'react-router-dom';
import { useInitializeDetailPanel } from './use_initialize_detail_panel';
import { renderHook } from '@testing-library/react-hooks';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import { timelineSelectors } from '../../../timelines/store/timeline';

jest.mock('../../hooks/use_selector');
jest.mock('../../../timelines/store/timeline', () => {
  const original = jest.requireActual('../../../timelines/store/timeline');
  return {
    ...original,
    timelineSelectors: {
      ...original.timelineSelectors,
      getTimelineByIdSelector: jest.fn(),
    },
  };
});
jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');
  return {
    ...original,
    useLocation: jest.fn(),
  };
});

describe('useInitializeDetailPanel', () => {
  beforeEach(() => {
    (useDeepEqualSelector as jest.Mock).mockImplementation((cb) => {
      return cb();
    });
    (timelineSelectors.getTimelineByIdSelector as jest.Mock).mockImplementation((cb) => {
      return jest.fn().mockReturnValue(undefined);
    });
  });
  afterEach(() => {
    (useDeepEqualSelector as jest.Mock).mockClear();
    (timelineSelectors.getTimelineByIdSelector as jest.Mock).mockClear();
  });

  describe('detail panel is not set', () => {
    test('should return null', () => {
      (useLocation as jest.Mock).mockReturnValue({
        search: '',
      });
      const { result } = renderHook(() => useInitializeDetailPanel());
      expect(result.current.detailPanel).toEqual(null);
    });
  });

  describe('detail panel is set', () => {
    test('should return an event detail panel', () => {
      (useLocation as jest.Mock).mockReturnValue({
        search:
          '?detailPanel=(panelView:eventDetail,params:(eventId:%27049edacba26686023c363340861669eaa94ffa0fd7b7b8f47371e7504c8b4c66%27,indexName:.internal.alerts-security.alerts-default-000001),tabType:query,timelineId:detections-page)',
      });
      const { result } = renderHook(() => useInitializeDetailPanel());
      expect(result.current.detailPanel).toEqual({
        panelView: 'eventDetail',
        params: {
          eventId: '049edacba26686023c363340861669eaa94ffa0fd7b7b8f47371e7504c8b4c66',
          indexName: '.internal.alerts-security.alerts-default-000001',
        },
        tabType: 'query',
        timelineId: 'detections-page',
      });
    });
  });
});
