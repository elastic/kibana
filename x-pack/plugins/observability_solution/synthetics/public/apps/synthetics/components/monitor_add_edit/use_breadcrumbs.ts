/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { MONITOR_ADD_ROUTE, MONITOR_EDIT_ROUTE } from '../../../../../common/constants';
import { PLUGIN } from '../../../../../common/constants/plugin';

export const useMonitorAddEditBreadcrumbs = (isEdit?: boolean) => {
  const kibana = useKibana();
  const appPath = kibana.services.application?.getUrlForApp(PLUGIN.SYNTHETICS_PLUGIN_ID) ?? '';

  const config = isEdit
    ? {
        text: EDIT_MONITOR_CRUMB,
        href: `${appPath}/${MONITOR_EDIT_ROUTE}`,
      }
    : {
        text: ADD_MONITOR_CRUMB,
        href: `${appPath}/${MONITOR_ADD_ROUTE}`,
      };

  useBreadcrumbs([config]);
};

export const ADD_MONITOR_CRUMB = i18n.translate(
  'xpack.synthetics.monitorManagement.addMonitorCrumb',
  {
    defaultMessage: 'Add monitor',
  }
);

export const EDIT_MONITOR_CRUMB = i18n.translate(
  'xpack.synthetics.monitorManagement.editMonitorCrumb',
  {
    defaultMessage: 'Edit monitor',
  }
);
