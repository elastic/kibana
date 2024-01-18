/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiLoadingSpinner } from '@elastic/eui';
import { getAbsoluteTimeRange } from '@kbn/data-plugin/common';
import { TimeRange } from '@kbn/es-query';
import { useActor } from '@xstate/react';
import React, { useMemo } from 'react';
import { useObservabilityLogExplorerPageStateContext } from '../../state_machines/observability_log_explorer/src';
import { useKibanaContextForPlugin } from '../../utils/use_kibana';

export const DatasetQualitySidebar = React.memo(() => {
  const [pageState] = useActor(useObservabilityLogExplorerPageStateContext());

  if (pageState.matches({ initialized: 'validLogExplorerState' })) {
    const { datasetSelection, time } = pageState.context.logExplorerState;
    if (datasetSelection.selectionType === 'single' && time != null) {
      return (
        <InitializedDatasetQualitySidebarContent
          dataStream={datasetSelection.selection.dataset.name}
          time={time}
        />
      );
    } else if (datasetSelection.selectionType === 'all' && time != null) {
      return <InitializedDatasetQualitySidebarContent dataStream="logs-*-*" time={time} />;
    } else {
      return <EuiCallOut>Please select a valid dataset.</EuiCallOut>;
    }
  } else {
    return <EuiLoadingSpinner />;
  }
});

const InitializedDatasetQualitySidebarContent = React.memo(
  ({ dataStream, time }: { dataStream: string; time: TimeRange }) => {
    const {
      services: {
        datasetQuality: { DataStreamQualityChecker },
      },
    } = useKibanaContextForPlugin();

    const timeRange = useMemo(() => {
      const absoluteTime = getAbsoluteTimeRange(time);
      return {
        start: absoluteTime.from,
        end: absoluteTime.to,
      };
    }, [time]);

    return <DataStreamQualityChecker dataStream={dataStream} timeRange={timeRange} />;
  }
);
