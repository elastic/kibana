/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  getDefaultEuiMarkdownParsingPlugins,
  getDefaultEuiMarkdownProcessingPlugins,
  getDefaultEuiMarkdownUiPlugins,
} from '@elastic/eui';
import { useTimelineContext } from '../timeline_context/use_timeline_context';
import { TemporaryProcessingPluginsType } from '../markdown_editor/types';
jest.mock('../timeline_context');

const mockTimelineComponent = (name: string) => <span data-test-subj={name}>{name}</span>;
const defaultParsingPlugins = getDefaultEuiMarkdownParsingPlugins();
const defaultProcessingPlugins = getDefaultEuiMarkdownProcessingPlugins() as TemporaryProcessingPluginsType;
const defaultUiPlugins = getDefaultEuiMarkdownUiPlugins();

export const timelineIntegrationMock = {
  editor_plugins: {
    parsingPlugins: defaultParsingPlugins,
    processingPlugins: defaultProcessingPlugins,
    uiPlugins: defaultUiPlugins,
  },
  hooks: {
    useInsertTimeline: jest.fn(),
  },
  ui: {
    renderInvestigateInTimelineActionComponent: (alertIds: string[]) =>
      mockTimelineComponent('investigate-in-timeline'),
    renderTimelineDetailsPanel: () => mockTimelineComponent('timeline-details-panel'),
  },
};

export const useTimelineContextMock = useTimelineContext as jest.Mock;
