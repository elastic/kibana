/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { createLazyObservabilityPageTemplate } from './lazy_page_template';
import { ObservabilityPageTemplate } from './page_template';
import { createNavigationRegistry } from '../../../services/navigation_registry';
import { ObservabilitySideNav } from './side_nav';
import { of } from 'rxjs';

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
        { label: 'Url A', app: 'TestA', path: '/url-a' },
        { label: 'Url B', app: 'TestA', path: '/url-b' },
      ],
    },
    {
      label: 'Test B',
      sortKey: 200,
      entries: [
        { label: 'Url A', app: 'TestB', path: '/url-a' },
        { label: 'Url B', app: 'TestB', path: '/url-b' },
      ],
    },
  ])
);

describe('Page template', () => {
  it('Provides a working lazy wrapper', () => {
    const LazyObservabilityPageTemplate = createLazyObservabilityPageTemplate({
      currentAppId$: of('Test app ID'),
      getUrlForApp: () => '/test-url',
      navigateToApp: async (appId) => {},
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
    expect(component).toMatchSnapshot();
  });

  it('Utilises the KibanaPageTemplate for rendering', () => {
    const component = shallow(
      <ObservabilityPageTemplate
        currentAppId$={of('Test app ID')}
        getUrlForApp={() => '/test-url'}
        navigateToApp={async (appId) => {}}
        navigationSections$={navigationRegistry.sections$}
        pageHeader={{
          pageTitle: 'Test title',
          rightSideItems: [<span>Test side item</span>],
        }}
      >
        <div>Test structure</div>
      </ObservabilityPageTemplate>
    );
    expect(component).toMatchSnapshot();
  });

  it('Handles outputting the registered navigation structures within a side nav', () => {
    // TODO: Try to improve this. useObservable inside this component will always use a [] initial value, so the first render
    // (and test result) isn't very useful.
    const component = shallow(
      <ObservabilitySideNav
        currentAppId$={of('Test app ID')}
        getUrlForApp={() => '/test-url'}
        navigateToApp={async (appId) => {}}
        navigationSections$={navigationRegistry.sections$}
      />
    );
    expect(component).toMatchSnapshot();
  });
});
