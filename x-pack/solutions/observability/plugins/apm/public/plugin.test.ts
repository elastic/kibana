/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { BehaviorSubject, of } from 'rxjs';
import { coreMock } from '@kbn/core/public/mocks';
import { cpsPluginMock } from '@kbn/cps/public/mocks';
import type { CPSAppAccessResolver, ICPSManager } from '@kbn/cps-utils';
import { ProjectRoutingAccess } from '@kbn/cps-utils';
import {
  OBSERVABILITY_APM_CPS_ENABLED_DEFAULT,
  OBSERVABILITY_APM_CPS_ENABLED_FEATURE_FLAG,
} from '@kbn/apm-shared/public';
import type { ITelemetryClient } from './services/telemetry';
import { TelemetryService } from './services/telemetry';
import type { ApmPluginStartDeps } from './plugin';
import { ApmPlugin, apmCpsManager$, getApmInternalServices } from './plugin';

describe('ApmPlugin', () => {
  const callApmApi = jest.fn();

  // `CPSPluginStart['cpsManager']` is optional and not deep-mocked, so own the spy to keep the
  // registered resolvers typed.
  const createCpsStart = () => {
    const registerAppAccess = jest.fn<void, [string, CPSAppAccessResolver]>();
    const startContract = cpsPluginMock.createStartContract();

    return {
      registerAppAccess,
      cps: { ...startContract, cpsManager: { ...startContract.cpsManager, registerAppAccess } },
    };
  };

  const startPlugin = (isCpsEnabled$: Observable<boolean>, { withCps = true } = {}) => {
    const core = coreMock.createStart();
    core.featureFlags.getBooleanValue$.mockReturnValue(isCpsEnabled$);

    const { cps, registerAppAccess } = createCpsStart();
    const plugins = {
      discoverShared: { features: { registry: { register: jest.fn() } } },
      share: {},
      lens: {},
      dataViews: {},
      apmShared: { callApmApi },
      cps: withCps ? cps : undefined,
    } as unknown as ApmPluginStartDeps;

    const plugin = new ApmPlugin(coreMock.createPluginInitializerContext());
    plugin.start(core, plugins);

    return { plugin, core, cps, registerAppAccess };
  };

  /** Access the APM app resolves to through the resolver registered by the nth flag emission. */
  const resolvedAccess = (
    registerAppAccess: ReturnType<typeof createCpsStart>['registerAppAccess'],
    callIndex: number
  ) => {
    const [appId, resolver] = registerAppAccess.mock.calls[callIndex];
    expect(appId).toBe('apm');
    return resolver('/app/apm');
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // `start()` builds the Discover service flyout renderer, which needs a telemetry client, and
    // the real service requires the analytics wiring from `setup()`.
    jest.spyOn(TelemetryService.prototype, 'start').mockReturnValue({} as ITelemetryClient);
  });

  it('observes the CPS flag with the shared default as fallback', () => {
    const { core } = startPlugin(of(true));

    expect(core.featureFlags.getBooleanValue$).toHaveBeenCalledWith(
      OBSERVABILITY_APM_CPS_ENABLED_FEATURE_FLAG,
      OBSERVABILITY_APM_CPS_ENABLED_DEFAULT
    );
  });

  it('registers editable access and publishes the manager when the flag is enabled', () => {
    const { cps, registerAppAccess } = startPlugin(of(true));

    expect(resolvedAccess(registerAppAccess, 0)).toBe(ProjectRoutingAccess.EDITABLE);
    expect(getApmInternalServices()).toEqual({ callApmApi, cpsManager: cps.cpsManager });
  });

  it('registers disabled access and withholds the manager when the flag is disabled', () => {
    const { registerAppAccess } = startPlugin(of(false));

    expect(resolvedAccess(registerAppAccess, 0)).toBe(ProjectRoutingAccess.DISABLED);
    expect(getApmInternalServices()).toEqual({ callApmApi, cpsManager: undefined });
  });

  it('follows the flag when it changes after start', () => {
    const isCpsEnabled$ = new BehaviorSubject(false);
    const { cps, registerAppAccess } = startPlugin(isCpsEnabled$);
    // Subscribed while CPS is off, like a service flyout mounted before the flag flips.
    const published: Array<ICPSManager | undefined> = [];
    const subscription = apmCpsManager$.subscribe((cpsManager) => published.push(cpsManager));

    expect(getApmInternalServices()?.cpsManager).toBeUndefined();

    isCpsEnabled$.next(true);

    expect(resolvedAccess(registerAppAccess, 1)).toBe(ProjectRoutingAccess.EDITABLE);
    expect(getApmInternalServices()?.cpsManager).toBe(cps.cpsManager);

    isCpsEnabled$.next(false);

    expect(resolvedAccess(registerAppAccess, 2)).toBe(ProjectRoutingAccess.DISABLED);
    expect(getApmInternalServices()?.cpsManager).toBeUndefined();

    subscription.unsubscribe();
    expect(published).toEqual([undefined, cps.cpsManager, undefined]);
  });

  it('stops following the flag on stop', () => {
    const isCpsEnabled$ = new BehaviorSubject(false);
    const { plugin, registerAppAccess } = startPlugin(isCpsEnabled$);

    plugin.stop();
    isCpsEnabled$.next(true);

    expect(registerAppAccess).toHaveBeenCalledTimes(1);
    expect(getApmInternalServices()?.cpsManager).toBeUndefined();
  });

  it('publishes the API client even when the CPS plugin is unavailable', () => {
    startPlugin(of(true), { withCps: false });

    expect(getApmInternalServices()).toEqual({ callApmApi, cpsManager: undefined });
  });
});
