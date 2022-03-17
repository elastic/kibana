/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { FC, useMemo } from 'react';
import {
  Axis,
  BarSeries,
  Chart,
  Position,
  ScaleType,
  SeriesColorAccessor,
  Settings,
  LineAnnotation,
  AnnotationDomainType,
} from '@elastic/charts';
import { EuiIcon, euiPaletteGray } from '@elastic/eui';
import { NodeDeploymentStatsResponse } from '../../../../common/types/trained_models';
import { useFieldFormatter } from '../../contexts/kibana/use_field_formatter';
import { useCurrentEuiTheme } from '../../components/color_range_legend';
import { FIELD_FORMAT_IDS } from '../../../../../../../src/plugins/field_formats/common';

interface MemoryPreviewChartProps {
  memoryOverview: NodeDeploymentStatsResponse['memory_overview'];
}

export const MemoryPreviewChart: FC<MemoryPreviewChartProps> = ({ memoryOverview }) => {
  const bytesFormatter = useFieldFormatter(FIELD_FORMAT_IDS.BYTES);

  const { euiTheme } = useCurrentEuiTheme();

  const groups = useMemo(
    () => ({
      jvm: {
        name: i18n.translate('xpack.ml.trainedModels.nodesList.jvmHeapSIze', {
          defaultMessage: 'JVM heap size',
        }),
        colour: euiTheme.euiColorVis1,
      },
      trained_models: {
        name: i18n.translate('xpack.ml.trainedModels.nodesList.modelsMemoryUsage', {
          defaultMessage: 'Trained models',
        }),
        colour: euiTheme.euiColorVis2,
      },
      anomaly_detection: {
        name: i18n.translate('xpack.ml.trainedModels.nodesList.adMemoryUsage', {
          defaultMessage: 'Anomaly detection jobs',
        }),
        colour: euiTheme.euiColorVis6,
      },
      dfa_training: {
        name: i18n.translate('xpack.ml.trainedModels.nodesList.dfaMemoryUsage', {
          defaultMessage: 'Data frame analytics jobs',
        }),
        colour: euiTheme.euiColorVis4,
      },
      available: {
        name: i18n.translate('xpack.ml.trainedModels.nodesList.availableMemory', {
          defaultMessage: 'Estimated available memory',
        }),
        colour: euiPaletteGray(5)[0],
      },
    }),
    []
  );

  const chartData = [
    {
      x: 0,
      y: memoryOverview.machine_memory.jvm,
      g: groups.jvm.name,
    },
    {
      x: 0,
      y: memoryOverview.trained_models.total,
      g: groups.trained_models.name,
    },
    {
      x: 0,
      y: memoryOverview.anomaly_detection.total,
      g: groups.anomaly_detection.name,
    },
    {
      x: 0,
      y: memoryOverview.dfa_training.total,
      g: groups.dfa_training.name,
    },
    {
      x: 0,
      y:
        memoryOverview.machine_memory.total -
        memoryOverview.machine_memory.jvm -
        memoryOverview.trained_models.total -
        memoryOverview.dfa_training.total -
        memoryOverview.anomaly_detection.total,
      g: groups.available.name,
    },
  ];

  const barSeriesColorAccessor: SeriesColorAccessor = ({ specId, yAccessor, splitAccessors }) => {
    const group = splitAccessors.get('g');

    return Object.values(groups).find((v) => v.name === group)!.colour;
  };

  return (
    <Chart size={['100%', 50]}>
      <Settings
        // TODO use the EUI charts theme see src/plugins/charts/public/services/theme/README.md
        rotation={90}
        tooltip={{
          headerFormatter: ({ value }) =>
            i18n.translate('xpack.ml.trainedModels.nodesList.memoryBreakdown', {
              defaultMessage: 'Approximate memory breakdown',
            }),
        }}
      />

      <Axis
        id="ml_memory"
        position={Position.Bottom}
        hide
        tickFormat={(d: number) => bytesFormatter(d)}
      />

      <LineAnnotation
        id="line_annotation"
        domainType={AnnotationDomainType.YDomain}
        dataValues={[
          {
            dataValue: memoryOverview.ml_max_in_bytes,
            details: bytesFormatter(memoryOverview.ml_max_in_bytes),
            header: i18n.translate('xpack.ml.trainedModels.nodesList.mlMaxMemory', {
              defaultMessage: 'Maximum memory permitted for ML native processes',
            }),
          },
        ]}
        marker={<EuiIcon type="arrowDown" />}
        markerPosition={Position.Top}
      />

      <BarSeries
        id="bars"
        xScaleType={ScaleType.Linear}
        yScaleType={ScaleType.Linear}
        xAccessor="x"
        yAccessors={['y']}
        splitSeriesAccessors={['g']}
        stackAccessors={['x']}
        data={chartData}
        color={barSeriesColorAccessor}
      />
    </Chart>
  );
};
