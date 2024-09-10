/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { ControlGroupRenderer } from '@kbn/controls-plugin/public';
import { Query } from '@kbn/es-query';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { useControlPanels } from '../hooks/use_control_panels';
import { LogsExplorerControllerStateService } from '../state_machines/logs_explorer_controller';

const DATA_SOURCE_FILTERS_CUSTOMIZATION_ID = 'dataSourceFiltersCustomization';

interface CustomDataSourceFiltersProps {
  logsExplorerControllerStateService: LogsExplorerControllerStateService;
  data: DataPublicPluginStart;
}

const CustomDataSourceFilters = ({
  logsExplorerControllerStateService,
  data,
}: CustomDataSourceFiltersProps) => {
  const { getInitialInput, setControlGroupAPI, query, filters, timeRange } = useControlPanels(
    logsExplorerControllerStateService,
    data
  );

  return (
    <div data-test-subj={DATA_SOURCE_FILTERS_CUSTOMIZATION_ID}>
      <ControlGroupRenderer
        ref={setControlGroupAPI}
        getCreationOptions={getInitialInput}
        query={query as Query}
        filters={filters ?? []}
        timeRange={timeRange}
      />
    </div>
  );
};

// eslint-disable-next-line import/no-default-export
export default CustomDataSourceFilters;
