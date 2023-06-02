/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useBreadcrumbs } from '../../../hooks/use_breadcrumbs';
import { MONITORS_ROUTE } from '../../../../../../common/constants';
import { PLUGIN } from '../../../../../../common/constants/plugin';

export const useMonitorListBreadcrumbs = (extraCrumbs?: Array<{ text: string; href?: string }>) => {
  const kibana = useKibana();
  const appPath = kibana.services.application?.getUrlForApp(PLUGIN.SYNTHETICS_PLUGIN_ID) ?? '';

  useBreadcrumbs([
    {
      text: MONITOR_MANAGEMENT_CRUMB,
      href: `${appPath}${MONITORS_ROUTE}`,
    },
    ...(extraCrumbs ?? []),
  ]);
};

const MONITOR_MANAGEMENT_CRUMB = i18n.translate('xpack.synthetics.monitorsPage.monitorsMCrumb', {
  defaultMessage: 'Monitors',
});
