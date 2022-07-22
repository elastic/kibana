/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { composeStories } from '@storybook/testing-react';
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { expectTextsInDocument } from '../../../utils/test_helpers';
import * as stories from './service_overview.stories';

const { Example } = composeStories(stories);

describe('ServiceOverview', () => {
  it('renders', async () => {
    const component = render(<Example />);

    await waitFor(() => {
      expectTextsInDocument(component, ['Latency']);
    });
  });
});
