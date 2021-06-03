/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { createNavigationRegistry } from '../../../observability/public/services/navigation_registry';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { createLazyObservabilityPageTemplate } from '../../../observability/public/components/shared/page_template/lazy_page_template';

export const createMockPageTemplate = () => {
  const navigationRegistry = createNavigationRegistry();

  navigationRegistry.registerSections(
    of([
      {
        label: 'Test A',
        sortKey: 100,
        entries: [
          { label: 'Section A Url A', app: 'TestA', path: '/url-a' },
          { label: 'Section A Url B', app: 'TestA', path: '/url-b' },
        ],
      },
      {
        label: 'Test B',
        sortKey: 200,
        entries: [
          { label: 'Section B Url A', app: 'TestB', path: '/url-a' },
          { label: 'Section B Url B', app: 'TestB', path: '/url-b' },
        ],
      },
    ])
  );

  const LazyObservabilityPageTemplate = createLazyObservabilityPageTemplate({
    currentAppId$: of('Test app ID'),
    getUrlForApp: () => '/test-url',
    navigateToApp: async () => {},
    navigationSections$: navigationRegistry.sections$,
  });

  return LazyObservabilityPageTemplate;
};
