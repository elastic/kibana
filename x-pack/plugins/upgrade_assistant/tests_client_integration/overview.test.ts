/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { OverviewTestBed, setup } from './helpers';

describe('<PageContent />', () => {
  let testBed: OverviewTestBed;

  beforeEach(async () => {
    await act(async () => {
      testBed = await setup();
    });
  });

  describe('Coming soon prompt', () => {
    // Default behavior up until the last minor before the next major release
    test('renders the coming soon prompt by default', () => {
      const { exists } = testBed;

      expect(exists('comingSoonPrompt')).toBe(true);
    });
  });

  describe('Tabs', () => {
    beforeEach(async () => {
      await act(async () => {
        // Override the default context value to verify tab content renders as expected
        // This will be the default behavior on the last minor before the next major release (e.g., v7.15)
        testBed = await setup({ isReadOnlyMode: false });
      });
    });

    test('renders the coming soon prompt by default', () => {
      const { exists } = testBed;

      expect(exists('comingSoonPrompt')).toBe(false);
      expect(exists('upgradeAssistantPageContent')).toBe(true);
    });
  });
});
