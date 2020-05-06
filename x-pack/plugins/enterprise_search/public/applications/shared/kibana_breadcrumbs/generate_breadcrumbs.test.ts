/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { generateBreadcrumb } from './generate_breadcrumbs';
import { appSearchBreadcrumbs, enterpriseSearchBreadcrumbs } from './';

import { mockHistory } from '../../__mocks__';

jest.mock('../react_router_helpers', () => ({ letBrowserHandleEvent: jest.fn(() => false) }));
import { letBrowserHandleEvent } from '../react_router_helpers';

describe('generateBreadcrumb', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a breadcrumb object matching EUI's breadcrumb type", () => {
    const breadcrumb = generateBreadcrumb({
      text: 'Hello World',
      path: '/hello_world',
      history: mockHistory,
    });
    expect(breadcrumb).toEqual({
      text: 'Hello World',
      href: '/enterprise_search/hello_world',
      onClick: expect.any(Function),
    });
  });

  it('prevents default navigation and uses React Router history on click', () => {
    const breadcrumb = generateBreadcrumb({ text: '', path: '/', history: mockHistory });
    const event = { preventDefault: jest.fn() };
    breadcrumb.onClick(event);

    expect(mockHistory.push).toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('does not prevents default browser behavior on new tab/window clicks', () => {
    const breadcrumb = generateBreadcrumb({ text: '', path: '/', history: mockHistory });

    letBrowserHandleEvent.mockImplementationOnce(() => true);
    breadcrumb.onClick();

    expect(mockHistory.push).not.toHaveBeenCalled();
  });
});

describe('appSearchBreadcrumbs', () => {
  const breadCrumbs = [
    {
      text: 'Page 1',
      path: '/page1',
    },
    {
      text: 'Page 2',
      path: '/page2',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const subject = () => appSearchBreadcrumbs(mockHistory)(breadCrumbs);

  it('Builds a chain of breadcrumbs with Enterprise Search and App Search at the root', () => {
    expect(subject()).toEqual([
      {
        href: '/enterprise_search/',
        onClick: expect.any(Function),
        text: 'Enterprise Search',
      },
      {
        href: '/enterprise_search/app_search',
        onClick: expect.any(Function),
        text: 'App Search',
      },
      {
        href: '/enterprise_search/page1',
        onClick: expect.any(Function),
        text: 'Page 1',
      },
      {
        href: '/enterprise_search/page2',
        onClick: expect.any(Function),
        text: 'Page 2',
      },
    ]);
  });

  it('shows just the root if breadcrumbs is empty', () => {
    expect(appSearchBreadcrumbs(mockHistory)()).toEqual([
      {
        href: '/enterprise_search/',
        onClick: expect.any(Function),
        text: 'Enterprise Search',
      },
      {
        href: '/enterprise_search/app_search',
        onClick: expect.any(Function),
        text: 'App Search',
      },
    ]);
  });

  describe('links', () => {
    const eventMock = {
      preventDefault: jest.fn(),
    };

    it('has a link to Enterprise Search Home page first', () => {
      subject()[0].onClick(eventMock);
      expect(mockHistory.push).toHaveBeenCalledWith('/');
    });

    it('has a link to App Search second', () => {
      subject()[1].onClick(eventMock);
      expect(mockHistory.push).toHaveBeenCalledWith('/app_search');
    });

    it('has a link to page 1 third', () => {
      subject()[2].onClick(eventMock);
      expect(mockHistory.push).toHaveBeenCalledWith('/page1');
    });

    it('has a link to page 2 last', () => {
      subject()[3].onClick(eventMock);
      expect(mockHistory.push).toHaveBeenCalledWith('/page2');
    });
  });
});

describe('enterpriseSearchBreadcrumbs', () => {
  const breadCrumbs = [
    {
      text: 'Page 1',
      path: '/page1',
    },
    {
      text: 'Page 2',
      path: '/page2',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const subject = () => enterpriseSearchBreadcrumbs(mockHistory)(breadCrumbs);

  it('Builds a chain of breadcrumbs with Enterprise Search at the root', () => {
    expect(subject()).toEqual([
      {
        href: '/enterprise_search/',
        onClick: expect.any(Function),
        text: 'Enterprise Search',
      },
      {
        href: '/enterprise_search/page1',
        onClick: expect.any(Function),
        text: 'Page 1',
      },
      {
        href: '/enterprise_search/page2',
        onClick: expect.any(Function),
        text: 'Page 2',
      },
    ]);
  });

  it('shows just the root if breadcrumbs is empty', () => {
    expect(enterpriseSearchBreadcrumbs(mockHistory)()).toEqual([
      {
        href: '/enterprise_search/',
        onClick: expect.any(Function),
        text: 'Enterprise Search',
      },
    ]);
  });

  describe('links', () => {
    const eventMock = {
      preventDefault: jest.fn(),
    };

    it('has a link to Enterprise Search Home page first', () => {
      subject()[0].onClick(eventMock);
      expect(mockHistory.push).toHaveBeenCalledWith('/');
    });

    it('has a link to page 1 second', () => {
      subject()[1].onClick(eventMock);
      expect(mockHistory.push).toHaveBeenCalledWith('/page1');
    });

    it('has a link to page 2 last', () => {
      subject()[2].onClick(eventMock);
      expect(mockHistory.push).toHaveBeenCalledWith('/page2');
    });
  });
});
