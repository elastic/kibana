/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  LastUpdatedAt,
  LastUpdatedAtProps,
  LoadingPanelProps,
  LoadingPanel,
  useDraggableKeyboardWrapper,
} from '../components';
import { useAddToTimeline, useAddToTimelineSensor } from '../hooks/use_add_to_timeline';
import { mockHoverActions } from './mock_hover_actions';

export const createTGridMocks = () => ({
  getHoverActions: () => mockHoverActions,
  // eslint-disable-next-line react/display-name
  getTGrid: () => <>{'hello grid'}</>,
  // eslint-disable-next-line react/display-name
  getFieldBrowser: () => <div data-test-subj="field-browser" />,
  // eslint-disable-next-line react/display-name
  getLastUpdated: (props: LastUpdatedAtProps) => <LastUpdatedAt {...props} />,
  // eslint-disable-next-line react/display-name
  getLoadingPanel: (props: LoadingPanelProps) => <LoadingPanel {...props} />,
  getUseAddToTimeline: () => useAddToTimeline,
  getUseAddToTimelineSensor: () => useAddToTimelineSensor,
  getUseDraggableKeyboardWrapper: () => useDraggableKeyboardWrapper,
  // eslint-disable-next-line react/display-name
  getAddToExistingCaseButton: () => <div data-test-subj="add-to-existing-case" />,
  // eslint-disable-next-line react/display-name
  getAddToNewCaseButton: () => <div data-test-subj="add-to-new-case" />,
});
