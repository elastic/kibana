/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { ControlGroupRenderer } from '@kbn/controls-plugin/public';
import { Query } from '@kbn/es-query';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { useControlPanels } from '../hooks/use_control_panels';
import { LogExplorerProfileStateService } from '../state_machines/log_explorer_profile';

const DATASET_FILTERS_CUSTOMIZATION_ID = 'datasetFiltersCustomization';

interface CustomDatasetFiltersProps {
  logExplorerProfileStateService: LogExplorerProfileStateService;
  data: DataPublicPluginStart;
}

const CustomDatasetFilters = ({
  logExplorerProfileStateService,
  data,
}: CustomDatasetFiltersProps) => {
  const { getInitialInput, setControlGroupAPI, query, filters, timeRange } = useControlPanels(
    logExplorerProfileStateService,
    data
  );

  return (
    <ControlGroupContainer data-test-subj={DATASET_FILTERS_CUSTOMIZATION_ID}>
      <ControlGroupRenderer
        ref={setControlGroupAPI}
        getCreationOptions={getInitialInput}
        query={query as Query}
        filters={filters ?? []}
        timeRange={timeRange}
      />
    </ControlGroupContainer>
  );
};

const ControlGroupContainer = euiStyled.div`
  .controlGroup {
    min-height: unset;
  }
`;

// eslint-disable-next-line import/no-default-export
export default CustomDatasetFilters;
