/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { UptimeCorePlugins, UptimeCoreSetup } from '../adapters';
import { UMServerLibs, UptimeESClient } from '../lib';
import { DynamicSettings } from '../../../common/runtime_types';
import { AlertTypeWithExecutor, LifecycleAlertService } from '../../../../rule_registry/server';
import { AlertInstanceContext } from '../../../../alerting/common';
import { AlertServices } from '../../../../alerting/server';

/**
 * Because all of our types are presumably going to list the `producer` as `'uptime'`,
 * we should just omit this field from the returned value to simplify the returned alert type.
 *
 * When we register all the alerts we can inject this field.
 */
export type DefaultUptimeAlertInstance<ActionGroupIds extends string> = Omit<
  AlertTypeWithExecutor<
    Record<string, any>,
    AlertInstanceContext,
    {
      alertWithLifecycle: LifecycleAlertService<AlertInstanceContext, ActionGroupIds>;
      dynamicSettings: DynamicSettings;
      uptimeEsClient: UptimeESClient;
    }
  >,
  'producer'
>;

export type UptimeAlertTypeFactory<ActionGroupIds extends string> = (
  server: UptimeCoreSetup,
  libs: UMServerLibs,
  plugins: UptimeCorePlugins
) => DefaultUptimeAlertInstance<ActionGroupIds>;
