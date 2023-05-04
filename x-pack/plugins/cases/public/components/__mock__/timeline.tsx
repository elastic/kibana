/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useTimelineContext } from '../timeline_context/use_timeline_context';
jest.mock('../timeline_context');

const mockTimelineComponent = (name: string) => <span data-test-subj={name}>{name}</span>;

export const timelineIntegrationMock = {
  editor_plugins: {
    parsingPlugin: jest.fn(),
    processingPluginRenderer: () => mockTimelineComponent('plugin-renderer'),
    uiPlugin: {
      name: 'mock-timeline',
      button: { label: 'mock-timeline-button', iconType: 'mock-timeline-icon' },
      editor: () => mockTimelineComponent('plugin-timeline-editor'),
    },
  },
  hooks: {
    useInsertTimeline: jest.fn(),
  },
  ui: {
    renderTimelineDetailsPanel: () => mockTimelineComponent('timeline-details-panel'),
  },
};

export const useTimelineContextMock = useTimelineContext as jest.Mock;
