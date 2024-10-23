/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import { getLogsLocatorsFromUrlService } from '@kbn/logs-shared-plugin/common';

import { CustomAssetsAccordion } from './components/custom_assets_accordion';
import type { CustomAssetsAccordionProps } from './components/custom_assets_accordion';
import { useStartServices } from './hooks';
import type { PackageAssetsComponent } from './types';

export const CustomLogsAssetsExtension: PackageAssetsComponent = () => {
  const {
    share: { url },
  } = useStartServices();
  const { logsLocator } = getLogsLocatorsFromUrlService(url);

  const views: CustomAssetsAccordionProps['views'] = [
    {
      name: i18n.translate('xpack.fleet.assets.customLogs.name', { defaultMessage: 'Logs' }),
      url: logsLocator.getRedirectUrl({}),
      description: i18n.translate('xpack.fleet.assets.customLogs.description', {
        defaultMessage: 'View Custom logs data in Logs Explorer',
      }),
    },
  ];

  return <CustomAssetsAccordion views={views} initialIsOpen />;
};
