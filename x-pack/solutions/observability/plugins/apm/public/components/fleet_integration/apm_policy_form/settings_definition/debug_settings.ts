/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { OPTIONAL_LABEL } from '../settings_form/utils';
import { SettingsRow } from '../typings';

export function getDebugSettings(): SettingsRow[] {
  return [
    {
      key: 'expvar_enabled',
      type: 'boolean',
      labelAppend: OPTIONAL_LABEL,
      rowTitle: i18n.translate('xpack.apm.fleet_integration.settings.debug.expvarEnabledTitle', {
        defaultMessage: 'Enable APM Server Golang expvar support',
      }),
      rowDescription: i18n.translate(
        'xpack.apm.fleet_integration.settings.debug.expvarEnabledDescription',
        { defaultMessage: 'Exposed under /debug/vars' }
      ),
    },
    {
      key: 'pprof_enabled',
      type: 'boolean',
      labelAppend: OPTIONAL_LABEL,
      rowTitle: i18n.translate('xpack.apm.fleet_integration.settings.debug.pprofEnabledTitle', {
        defaultMessage: 'Enable APM Server pprof support',
      }),
      rowDescription: i18n.translate(
        'xpack.apm.fleet_integration.settings.debug.pprofEnabledDescription',
        {
          defaultMessage: 'Expose HTTP endpoints to retrieve profiling data',
        }
      ),
    },
  ];
}
