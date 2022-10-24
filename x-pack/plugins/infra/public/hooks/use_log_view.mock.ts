/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createLogViewMock } from '../../common/log_views/log_view.mock';
import { createResolvedLogViewMockFromAttributes } from '../../common/log_views/resolved_log_view.mock';
import { useLogView } from './use_log_view';

type UseLogView = typeof useLogView;
type IUseLogView = ReturnType<UseLogView>;

const defaultLogViewId = 'default';

export const createUninitializedUseLogViewMock =
  (logViewId: string = defaultLogViewId) =>
  (): IUseLogView => ({
    derivedDataView: {
      fields: [],
      title: 'unknown',
    },
    hasFailedLoading: false,
    hasFailedLoadingLogView: false,
    hasFailedLoadingLogViewStatus: false,
    hasFailedResolvingLogView: false,
    isLoading: false,
    isLoadingLogView: false,
    isLoadingLogViewStatus: false,
    isResolvingLogView: false,
    isUninitialized: true,
    latestLoadLogViewFailures: [],
    load: jest.fn(),
    logView: undefined,
    logViewId,
    logViewStatus: undefined,
    resolvedLogView: undefined,
    update: jest.fn(),
  });

export const createLoadingUseLogViewMock =
  (logViewId: string = defaultLogViewId) =>
  (): IUseLogView => ({
    ...createUninitializedUseLogViewMock(logViewId)(),
    isLoading: true,
    isLoadingLogView: true,
    isLoadingLogViewStatus: true,
    isResolvingLogView: true,
  });

export const createLoadedUseLogViewMock = async (logViewId: string = defaultLogViewId) => {
  const logView = createLogViewMock(logViewId);
  const resolvedLogView = await createResolvedLogViewMockFromAttributes(logView.attributes);

  return (): IUseLogView => {
    return {
      ...createUninitializedUseLogViewMock(logViewId)(),
      logView,
      resolvedLogView,
      logViewStatus: {
        index: 'available',
      },
    };
  };
};
