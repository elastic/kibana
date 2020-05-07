/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ChromeBreadcrumb, CoreStart } from 'src/core/public';
import React from 'react';
import ReactDOM from 'react-dom';
import { get } from 'lodash';
import { i18n as i18nFormatter } from '@kbn/i18n';
import { alertTypeInitializers } from '../../alert_types';
import { UptimeApp, UptimeAppProps } from '../../../uptime_app';
import { getIntegratedAppAvailability } from './capabilities_adapter';
import {
  INTEGRATED_SOLUTIONS,
  PLUGIN,
  DEFAULT_DARK_MODE,
  DEFAULT_TIMEPICKER_QUICK_RANGES,
} from '../../../../common/constants';
import { UMFrameworkAdapter } from '../../lib';
import { ClientPluginsStart, ClientPluginsSetup } from '../../../apps/plugin';

export const getKibanaFrameworkAdapter = (
  core: CoreStart,
  plugins: ClientPluginsSetup,
  startPlugins: ClientPluginsStart
): UMFrameworkAdapter => {
  const {
    application: { capabilities },
    chrome: { setBadge, setHelpExtension },
    docLinks: { DOC_LINK_VERSION, ELASTIC_WEBSITE_URL },
    http: { basePath },
    i18n,
  } = core;

  const {
    data: { autocomplete },
    triggers_actions_ui,
  } = plugins;

  alertTypeInitializers.forEach(init => {
    const alertInitializer = init({ autocomplete });
    if (!triggers_actions_ui.alertTypeRegistry.has(alertInitializer.id)) {
      triggers_actions_ui.alertTypeRegistry.register(init({ autocomplete }));
    }
  });

  let breadcrumbs: ChromeBreadcrumb[] = [];
  core.chrome.getBreadcrumbs$().subscribe((nextBreadcrumbs?: ChromeBreadcrumb[]) => {
    breadcrumbs = nextBreadcrumbs || [];
  });

  const { apm, infrastructure, logs } = getIntegratedAppAvailability(
    capabilities,
    INTEGRATED_SOLUTIONS
  );

  const canSave = get(capabilities, 'uptime.save', false);

  const props: UptimeAppProps = {
    basePath: basePath.get(),
    canSave,
    core,
    darkMode: core.uiSettings.get(DEFAULT_DARK_MODE),
    commonlyUsedRanges: core.uiSettings.get(DEFAULT_TIMEPICKER_QUICK_RANGES),
    i18n,
    isApmAvailable: apm,
    isInfraAvailable: infrastructure,
    isLogsAvailable: logs,
    kibanaBreadcrumbs: breadcrumbs,
    plugins,
    startPlugins,
    renderGlobalHelpControls: () =>
      setHelpExtension({
        appName: i18nFormatter.translate('xpack.uptime.header.appName', {
          defaultMessage: 'Uptime',
        }),
        links: [
          {
            linkType: 'documentation',
            href: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/xpack-uptime.html`,
          },
          {
            linkType: 'discuss',
            href: 'https://discuss.elastic.co/c/uptime',
          },
        ],
      }),
    routerBasename: basePath.prepend(PLUGIN.ROUTER_BASE_NAME),
    setBadge,
    setBreadcrumbs: core.chrome.setBreadcrumbs,
  };

  return {
    render: async (element: any) => {
      if (element) {
        ReactDOM.render(<UptimeApp {...props} />, element);
      }
    },
  };
};
