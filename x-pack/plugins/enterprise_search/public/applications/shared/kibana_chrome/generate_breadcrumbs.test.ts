/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setMockValues } from '../../__mocks__/kea.mock';
import { mockKibanaValues, mockHistory } from '../../__mocks__';

jest.mock('../react_router_helpers', () => ({
  letBrowserHandleEvent: jest.fn(() => false),
  createHref: jest.requireActual('../react_router_helpers').createHref,
}));
import { letBrowserHandleEvent } from '../react_router_helpers';

import {
  useGenerateBreadcrumbs,
  useEuiBreadcrumbs,
  useEnterpriseSearchBreadcrumbs,
  useAppSearchBreadcrumbs,
  useWorkplaceSearchBreadcrumbs,
} from './generate_breadcrumbs';

describe('useGenerateBreadcrumbs', () => {
  const mockCurrentPath = (pathname: string) =>
    setMockValues({ history: { location: { pathname } } });

  afterAll(() => {
    setMockValues({ history: mockHistory });
  });

  it('accepts a trail of breadcrumb text and generates IBreadcrumb objs based on the current routing path', () => {
    const trail = ['Groups', 'Example Group Name', 'Source Prioritization'];
    const path = '/groups/{id}/source_prioritization';

    mockCurrentPath(path);
    const breadcrumbs = useGenerateBreadcrumbs(trail);

    expect(breadcrumbs).toEqual([
      { text: 'Groups', path: '/groups' },
      { text: 'Example Group Name', path: '/groups/{id}' },
      { text: 'Source Prioritization', path: '/groups/{id}/source_prioritization' },
    ]);
  });

  it('handles empty arrays gracefully', () => {
    mockCurrentPath('');
    expect(useGenerateBreadcrumbs([])).toEqual([]);
  });

  it('attempts to handle mismatched trail/path lengths gracefully', () => {
    mockCurrentPath('/page1/page2');
    expect(useGenerateBreadcrumbs(['Page 1', 'Page 2', 'Page 3'])).toEqual([
      { text: 'Page 1', path: '/page1' },
      { text: 'Page 2', path: '/page1/page2' },
      { text: 'Page 3' }, // The missing path falls back to breadcrumb text w/ no link
    ]);

    mockCurrentPath('/page1/page2/page3');
    expect(useGenerateBreadcrumbs(['Page 1', 'Page 2'])).toEqual([
      { text: 'Page 1', path: '/page1' },
      { text: 'Page 2', path: '/page1/page2' },
      // the /page3 path is ignored/not used
    ]);
  });
});

describe('useEuiBreadcrumbs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('accepts an array of breadcrumbs and to the array correctly injects SPA link navigation props', () => {
    const breadcrumb = useEuiBreadcrumbs([
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
    const breadcrumb = useEuiBreadcrumbs([{ text: '', path: '/test' }])[0] as any;

    expect(breadcrumb.href).toEqual('/app/enterprise_search/test');
    expect(mockHistory.createHref).toHaveBeenCalled();

    const event = { preventDefault: jest.fn() };
    breadcrumb.onClick(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(mockKibanaValues.navigateToUrl).toHaveBeenCalled();
  });

  it('does not call createHref if shouldNotCreateHref is passed', () => {
    const breadcrumb = useEuiBreadcrumbs([
      { text: '', path: '/test', shouldNotCreateHref: true },
    ])[0] as any;

    expect(breadcrumb.href).toEqual('/test');
    expect(mockHistory.createHref).not.toHaveBeenCalled();
  });

  it('does not prevent default browser behavior on new tab/window clicks', () => {
    const breadcrumb = useEuiBreadcrumbs([{ text: '', path: '/' }])[0] as any;

    (letBrowserHandleEvent as jest.Mock).mockImplementationOnce(() => true);
    breadcrumb.onClick();

    expect(mockKibanaValues.navigateToUrl).not.toHaveBeenCalled();
  });

  it('does not generate link behavior if path is excluded', () => {
    const breadcrumb = useEuiBreadcrumbs([{ text: 'Unclickable breadcrumb' }])[0];

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
