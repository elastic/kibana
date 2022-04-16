/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react-hooks';
import {
  useTimelineTypes,
  UseTimelineTypesArgs,
  UseTimelineTypesResult,
} from './use_timeline_types';

jest.mock('react-router-dom', () => {
  return {
    useParams: jest.fn().mockReturnValue('default'),
    useHistory: jest.fn().mockReturnValue([]),
  };
});

jest.mock('../../../common/components/link_to', () => {
  return {
    getTimelineTabsUrl: jest.fn(),
    useFormatUrl: jest.fn().mockReturnValue({
      formatUrl: jest.fn(),
      search: '',
    }),
  };
});

jest.mock('@kbn/kibana-react-plugin/public', () => {
  const originalModule = jest.requireActual('@kbn/kibana-react-plugin/public');
  const useKibana = jest.fn().mockImplementation(() => ({
    services: {
      application: {
        navigateToUrl: jest.fn(),
      },
    },
  }));

  return {
    ...originalModule,
    useKibana,
  };
});

describe('useTimelineTypes', () => {
  it('init', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<
        UseTimelineTypesArgs,
        UseTimelineTypesResult
      >(() => useTimelineTypes({ defaultTimelineCount: 0, templateTimelineCount: 3 }));
      await waitForNextUpdate();
      expect(result.current).toEqual({
        timelineType: 'default',
        timelineTabs: result.current.timelineTabs,
        timelineFilters: result.current.timelineFilters,
      });
    });
  });

  describe('timelineTabs', () => {
    it('render timelineTabs', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook<
          UseTimelineTypesArgs,
          UseTimelineTypesResult
        >(() => useTimelineTypes({ defaultTimelineCount: 0, templateTimelineCount: 3 }));
        await waitForNextUpdate();

        const { container } = render(result.current.timelineTabs);
        expect(
          container.querySelector('[data-test-subj="timeline-tab-default"]')
        ).toHaveTextContent('Timelines');
        expect(
          container.querySelector('[data-test-subj="timeline-tab-template"]')
        ).toHaveTextContent('Templates');
      });
    });

    it('set timelineTypes correctly', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook<
          UseTimelineTypesArgs,
          UseTimelineTypesResult
        >(() => useTimelineTypes({ defaultTimelineCount: 0, templateTimelineCount: 3 }));
        await waitForNextUpdate();

        const { container } = render(result.current.timelineTabs);

        fireEvent(
          container.querySelector('[data-test-subj="timeline-tab-template"]')!,
          new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
          })
        );

        expect(result.current).toEqual({
          timelineType: 'template',
          timelineTabs: result.current.timelineTabs,
          timelineFilters: result.current.timelineFilters,
        });
      });
    });

    it('stays in the same tab if clicking again on current tab', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook<
          UseTimelineTypesArgs,
          UseTimelineTypesResult
        >(() => useTimelineTypes({ defaultTimelineCount: 0, templateTimelineCount: 3 }));
        await waitForNextUpdate();

        const { container } = render(result.current.timelineTabs);

        fireEvent(
          container.querySelector('[data-test-subj="timeline-tab-default"]')!,
          new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
          })
        );

        expect(result.current).toEqual({
          timelineType: 'default',
          timelineTabs: result.current.timelineTabs,
          timelineFilters: result.current.timelineFilters,
        });
      });
    });
  });

  describe('timelineFilters', () => {
    it('render timelineFilters', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook<
          UseTimelineTypesArgs,
          UseTimelineTypesResult
        >(() => useTimelineTypes({ defaultTimelineCount: 0, templateTimelineCount: 3 }));
        await waitForNextUpdate();

        const { container } = render(<>{result.current.timelineFilters}</>);
        expect(
          container.querySelector('[data-test-subj="open-timeline-modal-body-filter-default"]')
        ).toHaveTextContent('Timelines');
        expect(
          container.querySelector('[data-test-subj="open-timeline-modal-body-filter-template"]')
        ).toHaveTextContent('Templates');
      });
    });

    it('set timelineTypes correctly', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook<
          UseTimelineTypesArgs,
          UseTimelineTypesResult
        >(() => useTimelineTypes({ defaultTimelineCount: 0, templateTimelineCount: 3 }));
        await waitForNextUpdate();

        const { container } = render(<>{result.current.timelineFilters}</>);

        fireEvent(
          container.querySelector('[data-test-subj="open-timeline-modal-body-filter-template"]')!,
          new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
          })
        );

        expect(result.current).toEqual({
          timelineType: 'template',
          timelineTabs: result.current.timelineTabs,
          timelineFilters: result.current.timelineFilters,
        });
      });
    });

    it('stays in the same tab if clicking again on current tab', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook<
          UseTimelineTypesArgs,
          UseTimelineTypesResult
        >(() => useTimelineTypes({ defaultTimelineCount: 0, templateTimelineCount: 3 }));
        await waitForNextUpdate();

        const { container } = render(<>{result.current.timelineFilters}</>);

        fireEvent(
          container.querySelector('[data-test-subj="open-timeline-modal-body-filter-default"]')!,
          new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
          })
        );

        expect(result.current).toEqual({
          timelineType: 'default',
          timelineTabs: result.current.timelineTabs,
          timelineFilters: result.current.timelineFilters,
        });
      });
    });
  });
});
