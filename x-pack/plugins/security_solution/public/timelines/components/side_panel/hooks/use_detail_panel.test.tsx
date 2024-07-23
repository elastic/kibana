/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook, act } from '@testing-library/react-hooks';
import React from 'react';
import type { UseDetailPanelConfig } from './use_detail_panel';
import { useDetailPanel } from './use_detail_panel';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { SourcererScopeName } from '../../../../sourcerer/store/model';
import { TimelineId, TimelineTabs } from '../../../../../common/types/timeline';
import { ExpandableFlyoutProvider } from '@kbn/expandable-flyout';
import { TestProviders } from '../../../../common/mock';
import { createTelemetryServiceMock } from '../../../../common/lib/telemetry/telemetry_service.mock';

const mockedTelemetry = createTelemetryServiceMock();
jest.mock('../../../../common/lib/kibana', () => {
  const original = jest.requireActual('../../../../common/lib/kibana');
  return {
    ...original,
    useKibana: () => ({
      ...original.useKibana(),
      services: {
        ...original.useKibana().services,
        telemetry: mockedTelemetry,
      },
    }),
  };
});
jest.mock('../../../../common/hooks/use_selector');
jest.mock('../../../store');

jest.mock('../../../../sourcerer/containers', () => {
  const mockSourcererReturn = {
    browserFields: {},
    loading: true,
    indexPattern: {},
    selectedPatterns: [],
    missingPatterns: [],
  };
  return {
    useSourcererDataView: jest.fn().mockReturnValue(mockSourcererReturn),
  };
});

describe('useDetailPanel', () => {
  const defaultProps: UseDetailPanelConfig = {
    sourcererScope: SourcererScopeName.detections,
    scopeId: TimelineId.test,
  };
  const mockGetExpandedDetail = jest.fn().mockImplementation(() => ({}));
  beforeEach(() => {
    (useDeepEqualSelector as jest.Mock).mockImplementation((cb) => {
      return mockGetExpandedDetail();
    });
  });
  afterEach(() => {
    (useDeepEqualSelector as jest.Mock).mockClear();
  });

  const wrapper = ({ children }: { children: React.ReactChild }) => (
    <TestProviders>
      <ExpandableFlyoutProvider>{children}</ExpandableFlyoutProvider>
    </TestProviders>
  );
  const renderUseDetailPanel = (props = defaultProps) =>
    renderHook(() => useDetailPanel(props), { wrapper });

  test('should return open fns (event, host, network, user), handleOnDetailsPanelClosed fn, shouldShowDetailsPanel, and the DetailsPanel component', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderUseDetailPanel();
      await waitForNextUpdate();

      expect(result.current.openEventDetailsPanel).toBeDefined();
      expect(result.current.shouldShowDetailsPanel).toBe(false);
      expect(result.current.DetailsPanel).toBeNull();
    });
  });

  test('should show the details panel', async () => {
    mockGetExpandedDetail.mockImplementation(() => ({
      [TimelineTabs.session]: {
        panelView: 'somePanel',
      },
    }));
    const updatedProps = {
      ...defaultProps,
      tabType: TimelineTabs.session,
    };

    await act(async () => {
      const { result, waitForNextUpdate } = renderUseDetailPanel(updatedProps);
      await waitForNextUpdate();

      expect(result.current.DetailsPanel).toMatchInlineSnapshot(`
        <Memo(DetailsPanel)
          browserFields={Object {}}
          handleOnPanelClosed={[Function]}
          scopeId="timeline-test"
          tabType="session"
        />
      `);
    });
  });
});
