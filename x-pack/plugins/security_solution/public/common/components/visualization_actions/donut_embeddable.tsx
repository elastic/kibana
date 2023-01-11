/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ChartLabel } from '../../../overview/components/detection_response/alerts_by_status/chart_label';
import type {
  DonutEmbeddableProps,
  VisualizationAlertsByStatusResponse,
} from '../../../overview/components/detection_response/alerts_by_status/types';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import { inputsSelectors } from '../../store/inputs';
import { DonutChartWrapper } from '../charts/donutchart';
import { VisualizationEmbeddable } from './lens_embeddable_managed';
import { parseVisualizationData } from './utils';

const DonutEmbeddableComponent: React.FC<DonutEmbeddableProps> = (props) => {
  const { label, id, ...lensprops } = props;
  const getGlobalQuery = inputsSelectors.globalQueryByIdSelector();
  const { inspect } = useDeepEqualSelector((state) => getGlobalQuery(state, id));
  const visualizationData = inspect?.response
    ? parseVisualizationData<VisualizationAlertsByStatusResponse>(inspect?.response)
    : null;

  const dataExists = visualizationData != null && visualizationData[0]?.hits.total !== 0;

  return (
    <DonutChartWrapper
      isChartEmbeddablesEnabled={true}
      dataExists={dataExists}
      label={label}
      title={dataExists ? <ChartLabel count={visualizationData[0]?.hits.total} /> : null}
    >
      <VisualizationEmbeddable id={id} {...lensprops} />
    </DonutChartWrapper>
  );
};

export const DonutEmbeddable = React.memo(DonutEmbeddableComponent);
