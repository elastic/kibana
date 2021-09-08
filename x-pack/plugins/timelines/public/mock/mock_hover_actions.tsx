/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

/* eslint-disable react/display-name */
export const mockHoverActions = {
  getAddToTimelineButton: () => <>{'Add To Timeline'}</>,
  getColumnToggleButton: () => <>{'Column Toggle'}</>,
  getCopyButton: () => <>{'Copy button'}</>,
  getFilterForValueButton: () => <>{'Filter button'}</>,
  getFilterOutValueButton: () => <>{'Filter out button'}</>,
  getOverflowButton: (props: { field: string }) => (
    <div data-test-subj={`more-actions-${props.field}`} {...props}>
      {'Overflow button'}
    </div>
  ),
};
