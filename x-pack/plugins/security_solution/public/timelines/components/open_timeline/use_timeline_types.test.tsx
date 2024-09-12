/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, renderHook, act, waitFor } from '@testing-library/react';
import type { UseTimelineTypesArgs, UseTimelineTypesResult } from './use_timeline_types';
import { useTimelineTypes } from './use_timeline_types';
import { TestProviders } from '../../../common/mock';

jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');
  return {
    ...original,
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
    const { result } = renderHook<UseTimelineTypesResult, UseTimelineTypesArgs>(
      () => useTimelineTypes({ defaultTimelineCount: 0, templateTimelineCount: 3 }),
      {
        wrapper: TestProviders,
      }
    );
    await waitFor(() => null);
    expect(result.current).toEqual({
      timelineType: 'default',
      timelineTabs: result.current.timelineTabs,
      timelineFilters: result.current.timelineFilters,
    });
  });

  describe('timelineTabs', () => {
    it('render timelineTabs', async () => {
      const { result } = renderHook<UseTimelineTypesResult, UseTimelineTypesArgs>(
        () => useTimelineTypes({ defaultTimelineCount: 0, templateTimelineCount: 3 }),
        {
          wrapper: TestProviders,
        }
      );
      await waitFor(() => null);

      const { container } = render(result.current.timelineTabs);
      expect(container.querySelector('[data-test-subj="timeline-tab-default"]')).toHaveTextContent(
        'Timelines'
      );
      expect(container.querySelector('[data-test-subj="timeline-tab-template"]')).toHaveTextContent(
        'Templates'
      );
    });

    it('set timelineTypes correctly', async () => {
      const { result } = renderHook<UseTimelineTypesResult, UseTimelineTypesArgs>(
        () => useTimelineTypes({ defaultTimelineCount: 0, templateTimelineCount: 3 }),
        {
          wrapper: TestProviders,
        }
      );
      await waitFor(() => null);

      const { container } = render(result.current.timelineTabs);

      act(() => {
        fireEvent(
          container.querySelector('[data-test-subj="timeline-tab-template"]')!,
          new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
          })
        );
      });

      await waitFor(() => null);

      expect(result.current).toEqual({
        timelineType: 'template',
        timelineTabs: result.current.timelineTabs,
        timelineFilters: result.current.timelineFilters,
      });
    });

    it('stays in the same tab if clicking again on current tab', async () => {
      const { result } = renderHook<UseTimelineTypesResult, UseTimelineTypesArgs>(
        () => useTimelineTypes({ defaultTimelineCount: 0, templateTimelineCount: 3 }),
        {
          wrapper: TestProviders,
        }
      );
      await waitFor(() => null);

      const { container } = render(result.current.timelineTabs);

      act(() => {
        fireEvent(
          container.querySelector('[data-test-subj="timeline-tab-default"]')!,
          new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
          })
        );
      });

      waitFor(() => null);

      expect(result.current).toEqual({
        timelineType: 'default',
        timelineTabs: result.current.timelineTabs,
        timelineFilters: result.current.timelineFilters,
      });
    });
  });

  describe('timelineFilters', () => {
    it('render timelineFilters', async () => {
      const { result } = renderHook<UseTimelineTypesResult, UseTimelineTypesArgs>(
        () => useTimelineTypes({ defaultTimelineCount: 0, templateTimelineCount: 3 }),
        {
          wrapper: TestProviders,
        }
      );
      await waitFor(() => null);

      const { container } = render(<>{result.current.timelineFilters}</>);

      expect(
        container.querySelector('[data-test-subj="open-timeline-modal-body-filter-default"]')
      ).toHaveTextContent('Timelines');
      expect(
        container.querySelector('[data-test-subj="open-timeline-modal-body-filter-template"]')
      ).toHaveTextContent('Templates');
    });

    it('set timelineTypes correctly', async () => {
      const { result } = renderHook<UseTimelineTypesResult, UseTimelineTypesArgs>(
        () => useTimelineTypes({ defaultTimelineCount: 0, templateTimelineCount: 3 }),
        {
          wrapper: TestProviders,
        }
      );
      await waitFor(() => null);

      const { container } = render(<>{result.current.timelineFilters}</>);

      act(() => {
        fireEvent(
          container.querySelector('[data-test-subj="open-timeline-modal-body-filter-template"]')!,
          new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
          })
        );
      });

      await waitFor(() => null);

      expect(result.current).toEqual({
        timelineType: 'template',
        timelineTabs: result.current.timelineTabs,
        timelineFilters: result.current.timelineFilters,
      });
    });

    it('stays in the same tab if clicking again on current tab', async () => {
      const { result } = renderHook<UseTimelineTypesResult, UseTimelineTypesArgs>(
        () => useTimelineTypes({ defaultTimelineCount: 0, templateTimelineCount: 3 }),
        {
          wrapper: TestProviders,
        }
      );

      await waitFor(() => null);

      const { container } = render(<>{result.current.timelineFilters}</>);

      act(() => {
        fireEvent(
          container.querySelector('[data-test-subj="open-timeline-modal-body-filter-default"]')!,
          new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
          })
        );
      });

      await waitFor(() => null);

      expect(result.current).toEqual({
        timelineType: 'default',
        timelineTabs: result.current.timelineTabs,
        timelineFilters: result.current.timelineFilters,
      });
    });
  });
});
