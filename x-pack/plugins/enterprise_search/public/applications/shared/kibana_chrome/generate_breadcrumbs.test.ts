/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../__mocks__/shallow_usecontext.mock';
import '../../__mocks__/react_router_history.mock';
import { mockKibanaContext, mockHistory } from '../../__mocks__';

jest.mock('../react_router_helpers', () => ({ letBrowserHandleEvent: jest.fn(() => false) }));
import { letBrowserHandleEvent } from '../react_router_helpers';

import {
  useBreadcrumbs,
  useEnterpriseSearchBreadcrumbs,
  useAppSearchBreadcrumbs,
  useWorkplaceSearchBreadcrumbs,
} from './generate_breadcrumbs';

describe('useBreadcrumbs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('accepts an array of breadcrumbs and to the array correctly injects SPA link navigation props', () => {
    const breadcrumb = useBreadcrumbs([
      {
        text: 'Hello',
        path: '/hello',
      },
      {
        text: 'World',
        path: '/world',
      },
    ]);
    expect(breadcrumb).toEqual([
      {
        text: 'Hello',
        href: '/app/enterprise_search/hello',
        onClick: expect.any(Function),
      },
      {
        text: 'World',
        href: '/app/enterprise_search/world',
        onClick: expect.any(Function),
      },
    ]);
  });

  it('prevents default navigation and uses React Router history on click', () => {
    const breadcrumb = useBreadcrumbs([{ text: '', path: '/test' }])[0] as any;
    const event = { preventDefault: jest.fn() };
    breadcrumb.onClick(event);

    expect(mockKibanaContext.navigateToUrl).toHaveBeenCalledWith('/app/enterprise_search/test');
    expect(mockHistory.createHref).toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('does not call createHref if shouldNotCreateHref is passed', () => {
    const breadcrumb = useBreadcrumbs([
      { text: '', path: '/test', shouldNotCreateHref: true },
    ])[0] as any;
    breadcrumb.onClick({ preventDefault: () => null });

    expect(mockKibanaContext.navigateToUrl).toHaveBeenCalledWith('/test');
    expect(mockHistory.createHref).not.toHaveBeenCalled();
  });

  it('does not prevent default browser behavior on new tab/window clicks', () => {
    const breadcrumb = useBreadcrumbs([{ text: '', path: '/' }])[0] as any;

    (letBrowserHandleEvent as jest.Mock).mockImplementationOnce(() => true);
    breadcrumb.onClick();

    expect(mockKibanaContext.navigateToUrl).not.toHaveBeenCalled();
  });

  it('does not generate link behavior if path is excluded', () => {
    const breadcrumb = useBreadcrumbs([{ text: 'Unclickable breadcrumb' }])[0];

    expect(breadcrumb.href).toBeUndefined();
    expect(breadcrumb.onClick).toBeUndefined();
  });
});

describe('useEnterpriseSearchBreadcrumbs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds a chain of breadcrumbs with Enterprise Search at the root', () => {
    const breadcrumbs = [
      {
        text: 'Page 1',
        path: '/page1',
      },
      {
        text: 'Page 2',
        path: '/page2',
      },
    ];

    expect(useEnterpriseSearchBreadcrumbs(breadcrumbs)).toEqual([
      {
        text: 'Enterprise Search',
        href: '/app/enterprise_search/overview',
        onClick: expect.any(Function),
      },
      {
        text: 'Page 1',
        href: '/app/enterprise_search/page1',
        onClick: expect.any(Function),
      },
      {
        text: 'Page 2',
        href: '/app/enterprise_search/page2',
        onClick: expect.any(Function),
      },
    ]);
  });

  it('shows just the root if breadcrumbs is empty', () => {
    expect(useEnterpriseSearchBreadcrumbs()).toEqual([
      {
        text: 'Enterprise Search',
        href: '/app/enterprise_search/overview',
        onClick: expect.any(Function),
      },
    ]);
  });
});

describe('useAppSearchBreadcrumbs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHistory.createHref.mockImplementation(
      ({ pathname }: any) => `/app/enterprise_search/app_search${pathname}`
    );
  });

  it('Builds a chain of breadcrumbs with Enterprise Search and App Search at the root', () => {
    const breadcrumbs = [
      {
        text: 'Page 1',
        path: '/page1',
      },
      {
        text: 'Page 2',
        path: '/page2',
      },
    ];

    expect(useAppSearchBreadcrumbs(breadcrumbs)).toEqual([
      {
        text: 'Enterprise Search',
        href: '/app/enterprise_search/overview',
        onClick: expect.any(Function),
      },
      {
        text: 'App Search',
        href: '/app/enterprise_search/app_search/',
        onClick: expect.any(Function),
      },
      {
        text: 'Page 1',
        href: '/app/enterprise_search/app_search/page1',
        onClick: expect.any(Function),
      },
      {
        text: 'Page 2',
        href: '/app/enterprise_search/app_search/page2',
        onClick: expect.any(Function),
      },
    ]);
  });

  it('shows just the root if breadcrumbs is empty', () => {
    expect(useAppSearchBreadcrumbs()).toEqual([
      {
        text: 'Enterprise Search',
        href: '/app/enterprise_search/overview',
        onClick: expect.any(Function),
      },
      {
        text: 'App Search',
        href: '/app/enterprise_search/app_search/',
        onClick: expect.any(Function),
      },
    ]);
  });
});

describe('useWorkplaceSearchBreadcrumbs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHistory.createHref.mockImplementation(
      ({ pathname }: any) => `/app/enterprise_search/workplace_search${pathname}`
    );
  });

  it('Builds a chain of breadcrumbs with Enterprise Search and Workplace Search at the root', () => {
    const breadcrumbs = [
      {
        text: 'Page 1',
        path: '/page1',
      },
      {
        text: 'Page 2',
        path: '/page2',
      },
    ];

    expect(useWorkplaceSearchBreadcrumbs(breadcrumbs)).toEqual([
      {
        text: 'Enterprise Search',
        href: '/app/enterprise_search/overview',
        onClick: expect.any(Function),
      },
      {
        text: 'Workplace Search',
        href: '/app/enterprise_search/workplace_search/',
        onClick: expect.any(Function),
      },
      {
        text: 'Page 1',
        href: '/app/enterprise_search/workplace_search/page1',
        onClick: expect.any(Function),
      },
      {
        text: 'Page 2',
        href: '/app/enterprise_search/workplace_search/page2',
        onClick: expect.any(Function),
      },
    ]);
  });

  it('shows just the root if breadcrumbs is empty', () => {
    expect(useWorkplaceSearchBreadcrumbs()).toEqual([
      {
        text: 'Enterprise Search',
        href: '/app/enterprise_search/overview',
        onClick: expect.any(Function),
      },
      {
        text: 'Workplace Search',
        href: '/app/enterprise_search/workplace_search/',
        onClick: expect.any(Function),
      },
    ]);
  });
});
