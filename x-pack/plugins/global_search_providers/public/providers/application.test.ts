/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getAppResultsMock } from './application.test.mocks';

import { EMPTY, of } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';
import { ApplicationStart, AppNavLinkStatus, AppStatus, PublicAppInfo } from 'src/core/public';
import {
  GlobalSearchProviderFindOptions,
  GlobalSearchProviderResult,
} from '../../../global_search/public';
import { applicationServiceMock } from 'src/core/public/mocks';
import { createApplicationResultProvider } from './application';

const getTestScheduler = () =>
  new TestScheduler((actual, expected) => {
    expect(actual).toEqual(expected);
  });

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

const createResult = (props: Partial<GlobalSearchProviderResult>): GlobalSearchProviderResult => ({
  id: 'id',
  title: 'title',
  type: 'application',
  url: '/app/id',
  score: 100,
  ...props,
});

const createAppMap = (apps: PublicAppInfo[]): Map<string, PublicAppInfo> => {
  return new Map(apps.map((app) => [app.id, app]));
};

const expectApp = (id: string) => expect.objectContaining({ id });
const expectResult = expectApp;

describe('applicationResultProvider', () => {
  let application: ReturnType<typeof applicationServiceMock.createStartContract>;

  const defaultOption: GlobalSearchProviderFindOptions = {
    preference: 'pref',
    maxResults: 20,
    aborted$: EMPTY,
  };

  beforeEach(() => {
    application = applicationServiceMock.createStartContract();
    getAppResultsMock.mockReturnValue([]);
  });

  it('has the correct id', () => {
    const provider = createApplicationResultProvider(Promise.resolve(application));
    expect(provider.id).toBe('application');
  });

  it('calls `getAppResults` with the term and the list of apps', async () => {
    application.applications$ = of(
      createAppMap([
        createApp({ id: 'app1', title: 'App 1' }),
        createApp({ id: 'app2', title: 'App 2' }),
        createApp({ id: 'app3', title: 'App 3' }),
      ])
    );
    const provider = createApplicationResultProvider(Promise.resolve(application));

    await provider.find('term', defaultOption).toPromise();

    expect(getAppResultsMock).toHaveBeenCalledTimes(1);
    expect(getAppResultsMock).toHaveBeenCalledWith('term', [
      expectApp('app1'),
      expectApp('app2'),
      expectApp('app3'),
    ]);
  });

  it('ignores inaccessible apps', async () => {
    application.applications$ = of(
      createAppMap([
        createApp({ id: 'app1', title: 'App 1' }),
        createApp({ id: 'disabled', title: 'disabled', status: AppStatus.inaccessible }),
      ])
    );
    const provider = createApplicationResultProvider(Promise.resolve(application));
    await provider.find('term', defaultOption).toPromise();

    expect(getAppResultsMock).toHaveBeenCalledWith('term', [expectApp('app1')]);
  });

  it('ignores apps with non-visible navlink', async () => {
    application.applications$ = of(
      createAppMap([
        createApp({ id: 'app1', title: 'App 1', navLinkStatus: AppNavLinkStatus.visible }),
        createApp({ id: 'disabled', title: 'disabled', navLinkStatus: AppNavLinkStatus.disabled }),
        createApp({ id: 'hidden', title: 'hidden', navLinkStatus: AppNavLinkStatus.hidden }),
      ])
    );
    const provider = createApplicationResultProvider(Promise.resolve(application));
    await provider.find('term', defaultOption).toPromise();

    expect(getAppResultsMock).toHaveBeenCalledWith('term', [expectApp('app1')]);
  });

  it('ignores chromeless apps', async () => {
    application.applications$ = of(
      createAppMap([
        createApp({ id: 'app1', title: 'App 1' }),
        createApp({ id: 'chromeless', title: 'chromeless', chromeless: true }),
      ])
    );

    const provider = createApplicationResultProvider(Promise.resolve(application));
    await provider.find('term', defaultOption).toPromise();

    expect(getAppResultsMock).toHaveBeenCalledWith('term', [expectApp('app1')]);
  });

  it('sorts the results returned by `getAppResults`', async () => {
    getAppResultsMock.mockReturnValue([
      createResult({ id: 'r60', score: 60 }),
      createResult({ id: 'r100', score: 100 }),
      createResult({ id: 'r50', score: 50 }),
      createResult({ id: 'r75', score: 75 }),
    ]);

    const provider = createApplicationResultProvider(Promise.resolve(application));
    const results = await provider.find('term', defaultOption).toPromise();

    expect(results).toEqual([
      expectResult('r100'),
      expectResult('r75'),
      expectResult('r60'),
      expectResult('r50'),
    ]);
  });

  it('only returns the highest `maxResults` results', async () => {
    getAppResultsMock.mockReturnValue([
      createResult({ id: 'r60', score: 60 }),
      createResult({ id: 'r100', score: 100 }),
      createResult({ id: 'r50', score: 50 }),
      createResult({ id: 'r75', score: 75 }),
    ]);

    const provider = createApplicationResultProvider(Promise.resolve(application));

    const options = {
      ...defaultOption,
      maxResults: 2,
    };
    const results = await provider.find('term', options).toPromise();

    expect(results).toEqual([expectResult('r100'), expectResult('r75')]);
  });

  it('only emits once, even if `application$` emits multiple times', () => {
    getTestScheduler().run(({ hot, expectObservable }) => {
      const appMap = createAppMap([createApp({ id: 'app1', title: 'App 1' })]);

      application.applications$ = hot('--a---b', { a: appMap, b: appMap });

      // test scheduler doesnt play well with promises. need to workaround by passing
      // an observable instead. Behavior with promise is asserted in previous tests of the suite
      const applicationPromise = (hot('a', { a: application }) as unknown) as Promise<
        ApplicationStart
      >;

      const provider = createApplicationResultProvider(applicationPromise);

      const options = {
        ...defaultOption,
        aborted$: hot<undefined>('|'),
      };

      const resultObs = provider.find('term', options);

      expectObservable(resultObs).toBe('--(a|)', { a: [] });
    });
  });

  it('only emits results until `aborted$` emits', () => {
    getTestScheduler().run(({ hot, expectObservable }) => {
      const appMap = createAppMap([createApp({ id: 'app1', title: 'App 1' })]);

      application.applications$ = hot('---a', { a: appMap, b: appMap });

      // test scheduler doesnt play well with promises. need to workaround by passing
      // an observable instead. Behavior with promise is asserted in previous tests of the suite
      const applicationPromise = (hot('a', { a: application }) as unknown) as Promise<
        ApplicationStart
      >;

      const provider = createApplicationResultProvider(applicationPromise);

      const options = {
        ...defaultOption,
        aborted$: hot<undefined>('-(a|)', { a: undefined }),
      };

      const resultObs = provider.find('term', options);

      expectObservable(resultObs).toBe('-|');
    });
  });
});
