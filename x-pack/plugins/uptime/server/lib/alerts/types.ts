/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Type } from '@kbn/config-schema';
import { UptimeCorePlugins, UptimeCoreSetup } from '../adapters';
import { UMServerLibs, UptimeESClient } from '../lib';
import { ActionVariable } from '../../../../alerting/common';
import { DynamicSettings } from '../../../common/runtime_types';
import { RuleType } from '../../../../rule_registry/server';

/**
 * Because all of our types are presumably going to list the `producer` as `'uptime'`,
 * we should just omit this field from the returned value to simplify the returned alert type.
 *
 * When we register all the alerts we can inject this field.
 */
export type DefaultUptimeAlertInstance = Omit<
  RuleType<
    any,
    Type<any>,
    ActionVariable,
    { alertWithLifecycle: any; dynamicSettings: DynamicSettings; uptimeEsClient: UptimeESClient }
  >,
  'producer'
>;

export type UptimeAlertTypeFactory = (
  server: UptimeCoreSetup,
  libs: UMServerLibs,
  plugins: UptimeCorePlugins
) => DefaultUptimeAlertInstance;
