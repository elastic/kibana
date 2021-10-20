/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { FC } from 'react';
import { Chart, Settings, BarSeries, ScaleType, Axis, Position } from '@elastic/charts';
import { NodeDeploymentStatsResponse } from '../../../../common/types/trained_models';
import { useFieldFormatter } from '../../contexts/kibana/use_field_formatter';

interface MemoryPreviewChartProps {
  memoryOverview: NodeDeploymentStatsResponse['memory_overview'];
}

export const MemoryPreviewChart: FC<MemoryPreviewChartProps> = ({ memoryOverview }) => {
  const bytesFormatter = useFieldFormatter('bytes');

  const chartData = [
    {
      x: 0,
      y: memoryOverview.anomaly_detection.total,
      g: i18n.translate('xpack.ml.trainedModels.nodesList.adMemoryUsage', {
        defaultMessage: 'Anomaly detection jobs',
      }),
    },
    {
      x: 0,
      y: memoryOverview.dfa_training.total,
      g: i18n.translate('xpack.ml.trainedModels.nodesList.dfaMemoryUsage', {
        defaultMessage: 'Data frame analytics jobs',
      }),
    },
    {
      x: 0,
      y: memoryOverview.trained_models.total,
      g: i18n.translate('xpack.ml.trainedModels.nodesList.modelsMemoryUsage', {
        defaultMessage: 'Trained models',
      }),
    },
    {
      x: 0,
      y:
        memoryOverview.machine_memory.total -
        memoryOverview.trained_models.total -
        memoryOverview.dfa_training.total -
        memoryOverview.anomaly_detection.total,
      g: i18n.translate('xpack.ml.trainedModels.nodesList.availableMemory', {
        defaultMessage: 'Estimated available memory',
      }),
    },
  ];

  return (
    <Chart size={['100%', 100]}>
      <Settings
        rotation={90}
        tooltip={{
          headerFormatter: ({ value }) =>
            i18n.translate('xpack.ml.trainedModels.nodesList.memoryBreakdown', {
              defaultMessage: 'Memory breakdown',
            }),
        }}
      />

      <Axis id="left2" position={Position.Bottom} hide tickFormat={(d: any) => bytesFormatter(d)} />

      <BarSeries
        id="bars"
        xScaleType={ScaleType.Linear}
        yScaleType={ScaleType.Linear}
        xAccessor="x"
        yAccessors={['y']}
        splitSeriesAccessors={['g']}
        stackAccessors={['x']}
        data={chartData}
      />
    </Chart>
  );
};
