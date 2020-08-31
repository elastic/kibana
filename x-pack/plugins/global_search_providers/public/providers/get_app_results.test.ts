/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AppNavLinkStatus, AppStatus, PublicAppInfo, PublicLegacyAppInfo } from 'src/core/public';
import { appToResult, getAppResults, scoreApp } from './get_app_results';

const createApp = (props: Partial<PublicAppInfo> = {}): PublicAppInfo => ({
  id: 'app1',
  title: 'App 1',
  appRoute: '/app/app1',
  legacy: false,
  status: AppStatus.accessible,
  navLinkStatus: AppNavLinkStatus.visible,
  chromeless: false,
  ...props,
});

const createLegacyApp = (props: Partial<PublicLegacyAppInfo> = {}): PublicLegacyAppInfo => ({
  id: 'app1',
  title: 'App 1',
  appUrl: '/app/app1',
  legacy: true,
  status: AppStatus.accessible,
  navLinkStatus: AppNavLinkStatus.visible,
  ...props,
});

describe('getAppResults', () => {
  it('retrieves the matching results', () => {
    const apps = [
      createApp({ id: 'dashboard', title: 'dashboard' }),
      createApp({ id: 'visualize', title: 'visualize' }),
    ];

    const results = getAppResults('dashboard', apps);

    expect(results.length).toBe(1);
    expect(results[0]).toEqual(expect.objectContaining({ id: 'dashboard', score: 100 }));
  });
});

describe('scoreApp', () => {
  describe('when the term is included in the title', () => {
    it('returns 100 if the app title is an exact match', () => {
      expect(scoreApp('dashboard', createApp({ title: 'dashboard' }))).toBe(100);
      expect(scoreApp('dashboard', createApp({ title: 'DASHBOARD' }))).toBe(100);
      expect(scoreApp('DASHBOARD', createApp({ title: 'DASHBOARD' }))).toBe(100);
      expect(scoreApp('dashBOARD', createApp({ title: 'DASHboard' }))).toBe(100);
    });

    it('returns 90 if the app title starts with the term', () => {
      expect(scoreApp('dash', createApp({ title: 'dashboard' }))).toBe(90);
      expect(scoreApp('DASH', createApp({ title: 'dashboard' }))).toBe(90);
    });

    it('returns 75 if the term in included in the app title', () => {
      expect(scoreApp('board', createApp({ title: 'dashboard' }))).toBe(75);
      expect(scoreApp('shboa', createApp({ title: 'dashboard' }))).toBe(75);
    });
  });

  describe('when the term is not included in the title', () => {
    it('returns the levenshtein ratio if superior or equal to 60', () => {
      expect(scoreApp('0123456789', createApp({ title: '012345' }))).toBe(60);
      expect(scoreApp('--1234567-', createApp({ title: '123456789' }))).toBe(60);
    });
    it('returns 0 if the levenshtein ratio is inferior to 60', () => {
      expect(scoreApp('0123456789', createApp({ title: '12345' }))).toBe(0);
      expect(scoreApp('1-2-3-4-5', createApp({ title: '123456789' }))).toBe(0);
    });
  });

  it('works with legacy apps', () => {
    expect(scoreApp('dashboard', createLegacyApp({ title: 'dashboard' }))).toBe(100);
    expect(scoreApp('dash', createLegacyApp({ title: 'dashboard' }))).toBe(90);
    expect(scoreApp('board', createLegacyApp({ title: 'dashboard' }))).toBe(75);
    expect(scoreApp('0123456789', createLegacyApp({ title: '012345' }))).toBe(60);
    expect(scoreApp('0123456789', createLegacyApp({ title: '12345' }))).toBe(0);
  });
});

describe('appToResult', () => {
  it('converts an app to a result', () => {
    const app = createApp({
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
      score: 42,
    });
  });

  it('converts a legacy app to a result', () => {
    const app = createLegacyApp({
      id: 'legacy',
      title: 'Legacy',
      euiIconType: 'legacyIcon',
      appUrl: '/app/legacy',
    });
    expect(appToResult(app, 69)).toEqual({
      id: 'legacy',
      title: 'Legacy',
      type: 'application',
      icon: 'legacyIcon',
      url: '/app/legacy',
      score: 69,
    });
  });
});
