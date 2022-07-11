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

import { APP_ID } from '../../../../common/constants';
import { getTimelinesInStorageByIds } from '../../../timelines/containers/local_storage';
import { TimelineId } from '../../../../common/types';
import { columns } from '../../../detections/configurations/security_solution_detections';
import { useRenderCellValue } from '../../../detections/configurations/security_solution_detections/render_cell_value';
import { useToGetInternalFlyout } from '../../../timelines/components/side_panel/event_details/flyout';

const registerAlertsTableConfiguration = (
  registry: AlertsTableConfigurationRegistryContract,
  storage: Storage
) => {
  if (registry.has(APP_ID)) {
    return;
  }
  const timelineStorage = getTimelinesInStorageByIds(storage, [TimelineId.detectionsPage]);
  const columnsFormStorage = timelineStorage?.[TimelineId.detectionsPage]?.columns ?? [];
  const alertColumns = columnsFormStorage.length ? columnsFormStorage : columns;

  registry.register({
    id: APP_ID,
    columns: alertColumns,
    getRenderCellValue: useRenderCellValue as GetRenderCellValue,
    useInternalFlyout: () => {
      const { header, body, footer } = useToGetInternalFlyout();
      return { header, body, footer };
    },
  });
};

export { registerAlertsTableConfiguration };
