/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import * as stories from './error_count_alert_trigger.stories';
import { composeStories } from '@storybook/testing-react';

const { CreatingInApmFromService } = composeStories(stories);

describe('ErrorCountAlertTrigger', () => {
  it('renders', () => {
    expect(() => render(<CreatingInApmFromService />)).not.toThrowError();
  });
});
