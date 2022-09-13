/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { GetTGridProps, TimelinesStartPlugins } from '../../../types';
import { useBulkActions } from './use_bulk_actions';
import { useActionItems } from './use_action_items';
import { useRenderCellValue } from './use_render_cell_value';

export const ALERT_TABLE_CONFIGURATION_KEY = 'timelinesAlertsTableConfiguration';

export function useAlertsTableConfiguration({
  columns,
}: Pick<GetTGridProps<'embedded'>, 'columns'>) {
  const {
    triggersActionsUi: { alertsTableConfigurationRegistry },
  } = useKibana<TimelinesStartPlugins>().services;

  // Make sure we are not registering the config twice
  if (alertsTableConfigurationRegistry.has(ALERT_TABLE_CONFIGURATION_KEY)) {
    return;
  }

  alertsTableConfigurationRegistry.register({
    id: ALERT_TABLE_CONFIGURATION_KEY,
    // TODO: is this necessary in our context?
    casesFeatureId: '',
    columns,
    // TODO: Is that correct?
    getRenderCellValue: useRenderCellValue,
    useBulkActions,
    useActionsColumn: useActionItems,
  });

  // TODO: what should we do with the rest of these?
  //  {
  //   useInternalFlyout?: () => {
  //       header: AlertTableFlyoutComponent;
  //       body: AlertTableFlyoutComponent;
  //       footer: AlertTableFlyoutComponent;
  //     };
  //   sort?: SortCombinations[];
  // }
}
