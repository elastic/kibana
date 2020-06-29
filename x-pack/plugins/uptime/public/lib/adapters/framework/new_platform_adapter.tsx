/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart } from 'src/core/public';
import React from 'react';
import ReactDOM from 'react-dom';
import { i18n as i18nFormatter } from '@kbn/i18n';
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

  const { apm, infrastructure, logs } = getIntegratedAppAvailability(
    capabilities,
    INTEGRATED_SOLUTIONS
  );

  const canSave = (capabilities.uptime.save ?? false) as boolean;

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
            href: `${ELASTIC_WEBSITE_URL}guide/en/uptime/${DOC_LINK_VERSION}/uptime-app-overview.html`,
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

      return () => {
        ReactDOM.unmountComponentAtNode(element);
      };
    },
  };
};
