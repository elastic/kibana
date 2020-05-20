/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TestUtils } from '../../../../../../src/plugins/es_ui_shared/public';

import { SearchProfilerTabs, Props } from './searchprofiler_tabs';

const { registerTestBed } = TestUtils;

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
