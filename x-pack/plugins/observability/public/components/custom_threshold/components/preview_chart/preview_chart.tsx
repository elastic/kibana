/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useEffect } from 'react';
import LensDocBuilder from './lens_doc_builder';
import { LensDoc } from './types';
import { useKibana } from '../../../../utils/kibana_react';
import { MetricExpression } from '../../types';

interface IGetAttribute {
  dataViewId: string;
  threshold: number;
  aggType: string;
  field: string;
}

interface PreviewChartPros {
  metricExpression: MetricExpression;
  dataViewId?: string;
}

function PreviewChart({ metricExpression, dataViewId }: PreviewChartPros) {
  const {
    services: { lens, dataViews, triggersActionsUi },
  } = useKibana();
  const { metrics, timeSize, timeUnit, threshold, equation, comparator } = metricExpression;
  const [attributes, setAttributes] = useState<LensDoc>();
  useEffect(() => {
    console.log('metrics', metrics);
    if (!metrics || metrics.length === 0) {
      return;
    }
    const { field, aggType, name, filter } = metrics[0];

    const lensDoc = new LensDocBuilder();
    if (field && aggType && dataViewId) {
      lensDoc.addDataLayer({
        layerId: 'main_date_histogram',
        accessors: 'main_date_histogram_accessors',
        xAccessor: 'main_date_histogram_xAccessor',
        dataViewId,
        operationType: 'average',
        sourceField: field,
        label: '@timestamp',
      });
    }
    if (threshold.length >= 1 && dataViewId) {

      lensDoc.addReferenceLayer({
        layerId: 'threshold_layer',
        dataViewId,
        accessors: 'threshold_layer_accessors',
        comparator,
        label: 'threshold_layer',
        value: threshold[0],
      });
    }
    setAttributes(lensDoc.getAttributes());
  }, [comparator, dataViewId, metrics, threshold]);
  if (!metrics || metrics.length === 0 || !dataViewId) {
    return <div>--------- Error ---------</div>;
  }
  if (metrics.length > 1) {
    // It means have to use formula
  }
  console.log(attributes);
  return (
    <div>
      <lens.EmbeddableComponent
        onLoad={(isLoading, adapters) => {
          console.log(isLoading);
          console.log(adapters);
        }}
        id=""
        style={{ height: 180 }}
        timeRange={{ from: `now-${timeSize * 20}${timeUnit}`, to: 'now' }}
        attributes={attributes}
      />
    </div>
  );
}
// eslint-disable-next-line import/no-default-export
export default PreviewChart; // Correct export
