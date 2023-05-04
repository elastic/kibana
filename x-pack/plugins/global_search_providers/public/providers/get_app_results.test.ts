/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AppNavLinkStatus,
  AppStatus,
  PublicAppInfo,
  DEFAULT_APP_CATEGORIES,
} from '@kbn/core/public';
import {
  AppLink,
  appToResult,
  getAppResults,
  scoreApp,
  keywordScoreWeighting,
} from './get_app_results';

const createApp = (props: Partial<PublicAppInfo> = {}): PublicAppInfo => ({
  id: 'app1',
  title: 'App 1',
  appRoute: '/app/app1',
  status: AppStatus.accessible,
  navLinkStatus: AppNavLinkStatus.visible,
  searchable: true,
  chromeless: false,
  keywords: [],
  deepLinks: [],
  ...props,
});

const createAppLink = (props: Partial<PublicAppInfo> = {}): AppLink => ({
  id: props.id ?? 'app1',
  path: props.appRoute ?? '/app/app1',
  subLinkTitles: [],
  keywords: props.keywords ?? [], // start off with the top level app keywords
  app: createApp(props),
});

describe('getAppResults', () => {
  it('retrieves the matching results', () => {
    const apps = [
      createApp({ id: 'dashboard', title: 'dashboard' }),
      createApp({ id: 'visualize', title: 'visualize' }),
      createApp({
        id: 'dashboard_not_searchable',
        title: 'dashboard not searchable',
        searchable: false,
      }),
    ];

    const results = getAppResults('dashboard', apps);

    expect(results.length).toBe(1);
    expect(results[0]).toEqual(expect.objectContaining({ id: 'dashboard', score: 100 }));
  });

  it('creates multiple links for apps with deepLinks', () => {
    const apps = [
      createApp({
        deepLinks: [
          {
            id: 'sub1',
            title: 'Sub1',
            path: '/sub1',
            deepLinks: [],
            keywords: [],
            navLinkStatus: AppNavLinkStatus.hidden,
            searchable: true,
          },
          {
            id: 'sub2',
            title: 'Sub2',
            path: '/sub2',
            deepLinks: [
              {
                id: 'sub2sub1',
                title: 'Sub2Sub1',
                path: '/sub2/sub1',
                deepLinks: [],
                keywords: [],
                navLinkStatus: AppNavLinkStatus.hidden,
                searchable: true,
              },
            ],
            keywords: [],
            navLinkStatus: AppNavLinkStatus.visible,
            searchable: false,
          },
        ],
        keywords: [],
      }),
    ];

    const results = getAppResults('App 1', apps);

    expect(results.map(({ title }) => title)).toEqual([
      'App 1',
      'App 1 / Sub1',
      'App 1 / Sub2 / Sub2Sub1',
    ]);
  });

  it('only includes deepLinks when search term is non-empty', () => {
    const apps = [
      createApp({
        deepLinks: [
          {
            id: 'sub1',
            title: 'Sub1',
            path: '/sub1',
            deepLinks: [],
            keywords: [],
            navLinkStatus: AppNavLinkStatus.hidden,
            searchable: true,
          },
        ],
        keywords: [],
      }),
      createApp({
        id: 'AppNotSearchable',
        title: 'App 1 not searchable',
        searchable: false,
      }),
    ];

    expect(getAppResults('', apps).length).toBe(1);
    expect(getAppResults('App 1', apps).length).toBe(2);
  });

  it('retrieves the matching results from keywords', () => {
    const apps = [createApp({ deepLinks: [], keywords: ['One'] })];
    const results = getAppResults('One', apps);
    expect(results.map(({ title }) => title)).toEqual(['App 1']);
  });

  it('retrieves the matching results from deeplink keywords', () => {
    const apps = [
      createApp({
        deepLinks: [
          {
            id: 'sub1',
            title: 'Sub1',
            path: '/sub1',
            deepLinks: [],
            keywords: [],
            navLinkStatus: AppNavLinkStatus.hidden,
            searchable: true,
          },
          {
            id: 'sub2',
            title: 'Sub2',
            path: '/sub2',
            deepLinks: [
              {
                id: 'sub2sub1',
                title: 'Sub2Sub1',
                path: '/sub2/sub1',
                deepLinks: [],
                keywords: ['TwoOne'],
                navLinkStatus: AppNavLinkStatus.hidden,
                searchable: true,
              },
            ],
            keywords: ['two'],
            navLinkStatus: AppNavLinkStatus.hidden,
            searchable: true,
          },
        ],
        keywords: [],
      }),
    ];

    const results = getAppResults('TwoOne', apps);
    expect(results.map(({ title }) => title)).toEqual(['App 1 / Sub2 / Sub2Sub1']);
  });
});

describe('scoreApp', () => {
  describe('when the term is included in the title', () => {
    it('returns 100 if the app title is an exact match', () => {
      expect(scoreApp('dashboard', createAppLink({ title: 'dashboard' }))).toBe(100);
      expect(scoreApp('dashboard', createAppLink({ title: 'DASHBOARD' }))).toBe(100);
      expect(scoreApp('DASHBOARD', createAppLink({ title: 'DASHBOARD' }))).toBe(100);
      expect(scoreApp('dashBOARD', createAppLink({ title: 'DASHboard' }))).toBe(100);
    });

    it('returns 90 if the app title starts with the term', () => {
      expect(scoreApp('dash', createAppLink({ title: 'dashboard' }))).toBe(90);
      expect(scoreApp('DASH', createAppLink({ title: 'dashboard' }))).toBe(90);
    });

    it('returns 75 if the term in included in the app title', () => {
      expect(scoreApp('board', createAppLink({ title: 'dashboard' }))).toBe(75);
      expect(scoreApp('shboa', createAppLink({ title: 'dashboard' }))).toBe(75);
    });
  });

  describe('when the term is not included in the title', () => {
    it('returns the levenshtein ratio if superior or equal to 60', () => {
      expect(scoreApp('0123456789', createAppLink({ title: '012345' }))).toBe(60);
      expect(scoreApp('--1234567-', createAppLink({ title: '123456789' }))).toBe(60);
    });
    it('returns 0 if the levenshtein ratio is inferior to 60', () => {
      expect(scoreApp('0123456789', createAppLink({ title: '12345' }))).toBe(0);
      expect(scoreApp('1-2-3-4-5', createAppLink({ title: '123456789' }))).toBe(0);
    });
  });

  describe('when the term is included in the keywords but not in the title', () => {
    it(`returns 100 * ${keywordScoreWeighting} if one of the app meta keywords is an exact match`, () => {
      expect(
        scoreApp('bar', createAppLink({ title: 'foo', keywords: ['bar'], deepLinks: [] }))
      ).toBe(100 * keywordScoreWeighting);
      expect(
        scoreApp('bar', createAppLink({ title: 'foo', keywords: ['BAR'], deepLinks: [] }))
      ).toBe(100 * keywordScoreWeighting);
    });
    it(`returns 90 * ${keywordScoreWeighting} if any of the keywords start with the term`, () => {
      expect(
        scoreApp(
          'viz',
          createAppLink({ title: 'Foo', keywords: ['Vizualize', 'Viz view'], deepLinks: [] })
        )
      ).toBe(90 * keywordScoreWeighting);
    });
    it(`returns 75 * ${keywordScoreWeighting} if the term is included in any of the keywords`, () => {
      expect(
        scoreApp(
          'board',
          createAppLink({ title: 'Foo', keywords: ['dashboard app'], deepLinks: [] })
        )
      ).toBe(75 * keywordScoreWeighting);
      expect(
        scoreApp(
          'shboa',
          createAppLink({ title: 'Foo', keywords: ['dashboard app'], deepLinks: [] })
        )
      ).toBe(75 * keywordScoreWeighting);
    });
  });

  describe('when the term is included in the keywords and the title', () => {
    it('returns 100 if one of the app meta keywords and the title is an exact match', () => {
      expect(
        scoreApp('home', createAppLink({ title: 'Home', keywords: ['home'], deepLinks: [] }))
      ).toBe(100);
      expect(
        scoreApp('Home', createAppLink({ title: 'Home', keywords: ['HOME'], deepLinks: [] }))
      ).toBe(100);
    });
    it('returns 90 if either one of the keywords or the title start with the term', () => {
      expect(
        scoreApp(
          'vis',
          createAppLink({ title: 'Visualize', keywords: ['Visualise'], deepLinks: [] })
        )
      ).toBe(90);
    });
    it('returns 75 if the term is included in the title or any of the keywords', () => {
      expect(
        scoreApp(
          'board',
          createAppLink({ title: 'Dashboard', keywords: ['dashboard app'], deepLinks: [] })
        )
      ).toBe(75);
      expect(
        scoreApp(
          'shboa',
          createAppLink({ title: 'dashboard', keywords: ['dashboard app'], deepLinks: [] })
        )
      ).toBe(75);
    });
  });

  describe('when the term is not included in the title or the keywords', () => {
    it('returns the levenshtein ratio if superior or equal to 60', () => {
      expect(
        scoreApp(
          '0123456789',
          createAppLink({ title: '012345', keywords: ['0345', '9987'], deepLinks: [] })
        )
      ).toBe(60);
      expect(
        scoreApp(
          '--1234567-',
          createAppLink({ title: '123456789', keywords: ['--345--'], deepLinks: [] })
        )
      ).toBe(60);
    });
    it('returns 0 if the levenshtein ratio is inferior to 60', () => {
      expect(
        scoreApp(
          '0123456789',
          createAppLink({ title: '12345', keywords: ['12', '34'], deepLinks: [] })
        )
      ).toBe(0);
      expect(
        scoreApp(
          '1-2-3-4-5',
          createAppLink({ title: '123456789', keywords: ['12-789'], deepLinks: [] })
        )
      ).toBe(0);
    });
  });
});

describe('appToResult', () => {
  it('converts an app to a result', () => {
    const app = createAppLink({
      id: 'foo',
      title: 'Foo',
      euiIconType: 'fooIcon',
      appRoute: '/app/foo',
      category: DEFAULT_APP_CATEGORIES.security,
    });
    expect(appToResult(app, 42)).toEqual({
      id: 'foo',
      title: 'Foo',
      type: 'application',
      icon: 'fooIcon',
      url: '/app/foo',
      meta: {
        categoryId: DEFAULT_APP_CATEGORIES.security.id,
        categoryLabel: DEFAULT_APP_CATEGORIES.security.label,
      },
      score: 42,
    });
  });

  it('converts an app without category to a result', () => {
    const app = createAppLink({
      id: 'foo',
      title: 'Foo',
      euiIconType: 'fooIcon',
      appRoute: '/app/foo',
    });
    expect(appToResult(app, 42)).toEqual({
      id: 'foo',
      title: 'Foo',
      type: 'application',
      icon: 'fooIcon',
      url: '/app/foo',
      meta: {
        categoryId: null,
        categoryLabel: null,
      },
      score: 42,
    });
  });

  it('includes the app name in sub links', () => {
    const app = createApp();
    const appLink: AppLink = {
      id: 'app1-sub',
      app,
      path: '/sub1',
      subLinkTitles: ['Sub1'],
      keywords: [],
    };

    expect(appToResult(appLink, 42).title).toEqual('App 1 / Sub1');
  });

  it('does not include the app name in sub links for Stack Management', () => {
    const app = createApp({ id: 'management' });
    const appLink: AppLink = {
      id: 'management-sub',
      app,
      path: '/sub1',
      subLinkTitles: ['Sub1'],
      keywords: [],
    };

    expect(appToResult(appLink, 42).title).toEqual('Sub1');
  });
});
