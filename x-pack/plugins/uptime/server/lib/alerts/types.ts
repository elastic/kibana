/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { UptimeCorePluginsSetup, UptimeServerSetup } from '../adapters';
import { UMServerLibs } from '../lib';
import { AlertTypeWithExecutor } from '../../../../rule_registry/server';
import { AlertInstanceContext, AlertTypeState } from '../../../../alerting/common';
import { LifecycleAlertService } from '../../../../rule_registry/server';

/**
 * Because all of our types are presumably going to list the `producer` as `'uptime'`,
 * we should just omit this field from the returned value to simplify the returned alert type.
 *
 * When we register all the alerts we can inject this field.
 */
export type DefaultUptimeAlertInstance<TActionGroupIds extends string> = AlertTypeWithExecutor<
  Record<string, any>,
  Record<string, any>,
  AlertInstanceContext,
  {
    alertWithLifecycle: LifecycleAlertService<
      AlertTypeState,
      AlertInstanceContext,
      TActionGroupIds
    >;
    getAlertStartedDate: (alertId: string) => string | null;
  }
>;

export type UptimeAlertTypeFactory<TActionGroupIds extends string> = (
  server: UptimeServerSetup,
  libs: UMServerLibs,
  plugins: UptimeCorePluginsSetup
) => DefaultUptimeAlertInstance<TActionGroupIds>;
