/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { appSearchBreadcrumbs, enterpriseSearchBreadcrumbs } from '../kibana_breadcrumbs';

jest.mock('../react_router_helpers', () => ({
  letBrowserHandleEvent: () => false,
}));

describe('appSearchBreadcrumbs', () => {
  const historyMock = {
    createHref: jest.fn().mockImplementation(path => path.pathname),
    push: jest.fn(),
  };

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

  afterEach(() => {
    jest.clearAllMocks();
  });

  const subject = () => appSearchBreadcrumbs(historyMock)(breadCrumbs);

  it('Builds a chain of breadcrumbs with Enterprise Search and App Search at the root', () => {
    expect(subject()).toEqual([
      {
        href: '/',
        onClick: expect.any(Function),
        text: 'Enterprise Search',
      },
      {
        href: '/app_search',
        onClick: expect.any(Function),
        text: 'App Search',
      },
      {
        href: '/page1',
        onClick: expect.any(Function),
        text: 'Page 1',
      },
      {
        href: '/page2',
        onClick: expect.any(Function),
        text: 'Page 2',
      },
    ]);
  });

  describe('links', () => {
    const eventMock = {
      preventDefault: jest.fn(),
    };

    it('has a link to Enterprise Search Home page first', () => {
      subject()[0].onClick(eventMock);
      expect(historyMock.push).toHaveBeenCalledWith('/');
    });

    it('has a link to App Search second', () => {
      subject()[1].onClick(eventMock);
      expect(historyMock.push).toHaveBeenCalledWith('/app_search');
    });

    it('has a link to page 1 third', () => {
      subject()[2].onClick(eventMock);
      expect(historyMock.push).toHaveBeenCalledWith('/page1');
    });

    it('has a link to page 2 last', () => {
      subject()[3].onClick(eventMock);
      expect(historyMock.push).toHaveBeenCalledWith('/page2');
    });
  });
});

describe('enterpriseSearchBreadcrumbs', () => {
  const historyMock = {
    createHref: jest.fn(),
    push: jest.fn(),
  };

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

  afterEach(() => {
    jest.clearAllMocks();
  });

  const subject = () => enterpriseSearchBreadcrumbs(historyMock)(breadCrumbs);

  it('Builds a chain of breadcrumbs with Enterprise Search at the root', () => {
    expect(subject()).toEqual([
      {
        href: undefined,
        onClick: expect.any(Function),
        text: 'Enterprise Search',
      },
      {
        href: undefined,
        onClick: expect.any(Function),
        text: 'Page 1',
      },
      {
        href: undefined,
        onClick: expect.any(Function),
        text: 'Page 2',
      },
    ]);
  });

  describe('links', () => {
    const eventMock = {
      preventDefault: jest.fn(),
    };

    it('has a link to Enterprise Search Home page first', () => {
      subject()[0].onClick(eventMock);
      expect(historyMock.push).toHaveBeenCalledWith('/');
    });

    it('has a link to page 1 second', () => {
      subject()[1].onClick(eventMock);
      expect(historyMock.push).toHaveBeenCalledWith('/page1');
    });

    it('has a link to page 2 last', () => {
      subject()[2].onClick(eventMock);
      expect(historyMock.push).toHaveBeenCalledWith('/page2');
    });
  });
});
