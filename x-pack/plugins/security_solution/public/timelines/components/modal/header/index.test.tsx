/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock/test_providers';
import { TimelineModalHeader } from '.';

const timelineId = 'timelineId';

describe('TimelinePortalHeader', () => {
  test('should render bottom bar for an unsaved timeline', () => {
    const { getByTestId } = render(
      <TestProviders>
        <TimelineModalHeader timelineId={timelineId} />
      </TestProviders>
    );

    expect(getByTestId('timeline-flyout-header-panel')).toBeInTheDocument();
  });
});
