/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { I18nProvider } from '@kbn/i18n-react';
import { render } from '@testing-library/react';
import { shallow } from 'enzyme';
import React from 'react';
import { of } from 'rxjs';
import { createNavigationRegistry } from '../../../services/navigation_registry';
import { createLazyObservabilityPageTemplate } from './lazy_page_template';
import { ObservabilityPageTemplate } from './page_template';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: () => ({
    pathname: '/test-path',
  }),
}));

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

describe('Page template', () => {
  it('Provides a working lazy wrapper', () => {
    const LazyObservabilityPageTemplate = createLazyObservabilityPageTemplate({
      currentAppId$: of('Test app ID'),
      getUrlForApp: () => '/test-url',
      navigateToApp: async () => {},
      navigationSections$: navigationRegistry.sections$,
    });

    const component = shallow(
      <LazyObservabilityPageTemplate
        pageHeader={{
          pageTitle: 'Test title',
          rightSideItems: [<span>Test side item</span>],
        }}
      >
        <div>Test structure</div>
      </LazyObservabilityPageTemplate>
    );

    expect(component.exists('lazy')).toBe(true);
  });

  it('Utilises the KibanaPageTemplate for rendering', () => {
    const component = shallow(
      <ObservabilityPageTemplate
        currentAppId$={of('Test app ID')}
        getUrlForApp={() => '/test-url'}
        navigateToApp={async () => {}}
        navigationSections$={navigationRegistry.sections$}
        pageHeader={{
          pageTitle: 'Test title',
          rightSideItems: [<span>Test side item</span>],
        }}
      >
        <div>Test structure</div>
      </ObservabilityPageTemplate>
    );

    expect(component.is('KibanaPageTemplate'));
  });

  it('Handles outputting the registered navigation structures within a side nav', () => {
    const { container } = render(
      <I18nProvider>
        <ObservabilityPageTemplate
          currentAppId$={of('Test app ID')}
          getUrlForApp={() => '/test-url'}
          navigateToApp={async () => {}}
          navigationSections$={navigationRegistry.sections$}
          pageHeader={{
            pageTitle: 'Test title',
            rightSideItems: [<span>Test side item</span>],
          }}
        >
          <div>Test structure</div>
        </ObservabilityPageTemplate>
      </I18nProvider>
    );

    expect(container).toHaveTextContent('Section A Url A');
    expect(container).toHaveTextContent('Section A Url B');
    expect(container).toHaveTextContent('Section B Url A');
    expect(container).toHaveTextContent('Section B Url B');
  });
});
