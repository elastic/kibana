/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Type } from '@kbn/config-schema';
import { UptimeCorePlugins, UptimeCoreSetup } from '../adapters';
import { UMServerLibs } from '../lib';
import { ActionGroup } from '../../../../alerting/server';
import { ActionVariable } from '../../../../alerting/common';
import { DynamicSettings } from '../../../common/runtime_types';

// TODO: if we export the `RuleType` from the `rule_registry` plugin, we can delete this
// and use the type they maintain instead. This will reduce risk of type issues in the future.
interface UptimeAlertInstance {
  validate: {
    params: Type<any>;
  };
  defaultActionGroupId: string;
  id: string;
  name: string;
  actionGroups: Array<ActionGroup<string>>;
  actionVariables: {
    context: ActionVariable[];
  };
  minimumLicenseRequired: 'basic' | 'gold' | 'trial';
  executor: (params: {
    params: any;
    state: any;
    uptimeEsClient: any;
    dynamicSettings: DynamicSettings;
    alertWithLifecycle: any;
    savedObjectsClient: any;
  }) => any;
  producer: string;
}

/**
 * Because all of our types are presumably going to list the `producer` as `'uptime'`,
 * we should just omit this field from the returned value to simplify the returned alert type.
 *
 * When we register all the alerts we can inject this field.
 */
type DefaultUptimeAlertInstance = Omit<UptimeAlertInstance, 'producer'>;

export type UptimeAlertTypeFactory = (
  server: UptimeCoreSetup,
  libs: UMServerLibs,
  plugins: UptimeCorePlugins
) => DefaultUptimeAlertInstance;
