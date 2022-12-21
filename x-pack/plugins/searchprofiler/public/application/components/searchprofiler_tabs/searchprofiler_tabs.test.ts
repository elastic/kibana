/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerTestBed } from '@kbn/test-jest-helpers';

import { SearchProfilerTabs, Props } from './searchprofiler_tabs';

describe('Search Profiler Tabs', () => {
  it('renders', async () => {
    const props: Props = {
      activateTab: () => {},
      activeTab: null,
      has: {
        aggregations: true,
        searches: true,
      },
    };
    const init = registerTestBed(SearchProfilerTabs);
    await init(props);
  });
});
