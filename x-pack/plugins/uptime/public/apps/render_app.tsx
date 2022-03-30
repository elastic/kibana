/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { i18n as i18nFormatter } from '@kbn/i18n';
import { AppMountParameters, CoreStart } from 'kibana/public';
import { getIntegratedAppAvailability } from '../lib/adapters/framework/capabilities_adapter';
import {
  DEFAULT_DARK_MODE,
  DEFAULT_TIMEPICKER_QUICK_RANGES,
  INTEGRATED_SOLUTIONS,
} from '../../common/constants';
import { UptimeApp, UptimeAppProps } from './uptime_app';
import { ClientPluginsSetup, ClientPluginsStart } from './plugin';
import { UptimeUiConfig } from '../../common/config';

export function renderApp(
  core: CoreStart,
  plugins: ClientPluginsSetup,
  startPlugins: ClientPluginsStart,
  appMountParameters: AppMountParameters,
  config: UptimeUiConfig
) {
  const {
    application: { capabilities },
    chrome: { setBadge, setHelpExtension },
    docLinks,
    http: { basePath },
    i18n,
  } = core;

  const { apm, infrastructure, logs } = getIntegratedAppAvailability(
    capabilities,
    INTEGRATED_SOLUTIONS
  );

  const canSave = (capabilities.uptime.save ?? false) as boolean;

  const props: UptimeAppProps = {
    plugins,
    canSave,
    core,
    i18n,
    startPlugins,
    basePath: basePath.get(),
    darkMode: core.uiSettings.get(DEFAULT_DARK_MODE),
    commonlyUsedRanges: core.uiSettings.get(DEFAULT_TIMEPICKER_QUICK_RANGES),
    isApmAvailable: apm,
    isInfraAvailable: infrastructure,
    isLogsAvailable: logs,
    renderGlobalHelpControls: () =>
      setHelpExtension({
        appName: i18nFormatter.translate('xpack.uptime.header.appName', {
          defaultMessage: 'Uptime',
        }),
        links: [
          {
            linkType: 'documentation',
            href: `${docLinks.links.observability.monitorUptime}`,
          },
          {
            linkType: 'discuss',
            href: 'https://discuss.elastic.co/c/uptime',
          },
        ],
      }),
    setBadge,
    appMountParameters,
    setBreadcrumbs: core.chrome.setBreadcrumbs,
    config,
  };

  ReactDOM.render(<UptimeApp {...props} />, appMountParameters.element);

  return () => {
    ReactDOM.unmountComponentAtNode(appMountParameters.element);
  };
}
