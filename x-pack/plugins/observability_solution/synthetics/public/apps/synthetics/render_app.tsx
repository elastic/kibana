/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { i18n as i18nFormatter } from '@kbn/i18n';
import { AppMountParameters, CoreStart } from '@kbn/core/public';
import { SyntheticsAppProps } from './contexts';
import { getIntegratedAppAvailability } from './utils/adapters';
import { DEFAULT_TIMEPICKER_QUICK_RANGES, INTEGRATED_SOLUTIONS } from '../../../common/constants';
import { SyntheticsApp } from './synthetics_app';
import { ClientPluginsSetup, ClientPluginsStart } from '../../plugin';

export function renderApp(
  core: CoreStart,
  plugins: ClientPluginsSetup,
  startPlugins: ClientPluginsStart,
  appMountParameters: AppMountParameters,
  isDev: boolean,
  isServerless: boolean
) {
  const {
    application: { capabilities },
    chrome: { setBadge, setHelpExtension },
    docLinks,
    http: { basePath },
    i18n,
    theme,
  } = core;

  const { apm, infrastructure, logs } = getIntegratedAppAvailability(
    capabilities,
    INTEGRATED_SOLUTIONS
  );

  const canSave = (capabilities.uptime.save ?? false) as boolean; // TODO: Determine for synthetics
  const darkMode = theme.getTheme().darkMode;

  const props: SyntheticsAppProps = {
    isDev,
    plugins,
    canSave,
    core,
    i18n,
    startPlugins,
    basePath: basePath.get(),
    darkMode,
    commonlyUsedRanges: core.uiSettings.get(DEFAULT_TIMEPICKER_QUICK_RANGES),
    isApmAvailable: apm,
    isInfraAvailable: infrastructure,
    isLogsAvailable: logs,
    renderGlobalHelpControls: () =>
      setHelpExtension({
        appName: i18nFormatter.translate('xpack.synthetics.header.appName', {
          defaultMessage: 'Synthetics',
        }),
        links: [
          {
            linkType: 'documentation',
            href: `${docLinks.links.observability.monitorUptimeSynthetics}`,
          },
          {
            linkType: 'discuss',
            href: 'https://discuss.elastic.co/c/uptime', // Redirects to https://discuss.elastic.co/c/observability/synthetics/75
          },
        ],
      }),
    setBadge,
    appMountParameters,
    isServerless,
    setBreadcrumbs: startPlugins.serverless?.setBreadcrumbs ?? core.chrome.setBreadcrumbs,
  };

  ReactDOM.render(<SyntheticsApp {...props} />, appMountParameters.element);

  return () => {
    startPlugins.data.search.session.clear();
    ReactDOM.unmountComponentAtNode(appMountParameters.element);
  };
}
