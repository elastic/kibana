/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type {
  AlertsTableConfigurationRegistryContract,
  GetRenderCellValue,
} from '@kbn/triggers-actions-ui-plugin/public';

import { APP_ID, CASES_FEATURE_ID } from '../../../../common/constants';
import { getDataTablesInStorageByIds } from '../../../timelines/containers/local_storage';
import { TableId } from '../../../../common/types';
import { getColumns } from '../../../detections/configurations/security_solution_detections';
import { useRenderCellValue } from '../../../detections/configurations/security_solution_detections/render_cell_value';
import { useToGetInternalFlyout } from '../../../timelines/components/side_panel/event_details/flyout';

const registerAlertsTableConfiguration = (
  registry: AlertsTableConfigurationRegistryContract,
  storage: Storage
) => {
  if (registry.has(APP_ID)) {
    return;
  }
  const dataTableStorage = getDataTablesInStorageByIds(storage, [TableId.alertsOnAlertsPage]);
  const columnsFormStorage = dataTableStorage?.[TableId.alertsOnAlertsPage]?.columns ?? [];
  const alertColumns = columnsFormStorage.length ? columnsFormStorage : getColumns();

  registry.register({
    id: APP_ID,
    casesFeatureId: CASES_FEATURE_ID,
    columns: alertColumns,
    getRenderCellValue: useRenderCellValue as GetRenderCellValue,
    useInternalFlyout: () => {
      const { header, body, footer } = useToGetInternalFlyout();
      return { header, body, footer };
    },
  });
};

export { registerAlertsTableConfiguration };
