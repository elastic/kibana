/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useSelectedLocation } from '../../monitor_details/hooks/use_selected_location';
import { useSelectedMonitor } from '../../monitor_details/hooks/use_selected_monitor';
import { useBreadcrumbs } from '../../../hooks/use_breadcrumbs';
import { ConfigKey } from '../../../../../../common/runtime_types';
import { MONITOR_ROUTE, MONITORS_ROUTE } from '../../../../../../common/constants';
import { PLUGIN } from '../../../../../../common/constants/plugin';

export const useTestRunDetailsBreadcrumbs = (
  extraCrumbs?: Array<{ text: string; href?: string }>
) => {
  const kibana = useKibana();
  const appPath = kibana.services.application?.getUrlForApp(PLUGIN.SYNTHETICS_PLUGIN_ID) ?? '';

  const { monitor } = useSelectedMonitor();
  const selectedLocation = useSelectedLocation();

  useBreadcrumbs([
    {
      text: MONITOR_MANAGEMENT_CRUMB,
      href: `${appPath}${MONITORS_ROUTE}`,
    },
    ...(monitor
      ? [
          {
            text: monitor?.name ?? '',
            href: `${appPath}${MONITOR_ROUTE.replace(
              ':monitorId',
              monitor?.[ConfigKey.CONFIG_ID] ?? ''
            )}?locationId=${selectedLocation?.id ?? ''}`,
          },
        ]
      : []),
    ...(extraCrumbs ?? []),
  ]);
};

const MONITOR_MANAGEMENT_CRUMB = i18n.translate('xpack.synthetics.monitorsPage.monitorsMCrumb', {
  defaultMessage: 'Monitors',
});
