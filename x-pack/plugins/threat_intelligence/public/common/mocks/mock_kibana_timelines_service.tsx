/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { HoverActionsConfig } from '@kbn/timelines-plugin/public/components/hover_actions';
import { EuiButtonIcon } from '@elastic/eui';
import { TimelinesUIStart } from '@kbn/timelines-plugin/public';

/**
 * Returns a default object to mock the timelines plugin for our unit tests and storybook stories.
 * The button mocks a window.alert onClick event.
 */
export const mockKibanaTimelinesService: TimelinesUIStart = {
  getHoverActions(): HoverActionsConfig {
    return {
      getAddToTimelineButton: () => (
        <EuiButtonIcon
          iconType="timeline"
          iconSize="s"
          onClick={() => window.alert('Add to Timeline button clicked')}
        />
      ),
    } as unknown as HoverActionsConfig;
  },
} as unknown as TimelinesUIStart;
