/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useEffect } from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';

import { OperationType } from '@kbn/lens-plugin/public';
import {
  Aggregators,
  CustomMetricAggTypes,
} from '../../../../../common/custom_threshold_rule/types';
import LensDocBuilder from './lens_doc_builder';
import { useKibana } from '../../../../utils/kibana_react';
import { MetricExpression } from '../../types';

interface PreviewChartPros {
  metricExpression: MetricExpression;
  dataViewId?: string;
  filterQuery?: string;
  groupBy?: string | string[];
}

function PreviewChart({ metricExpression, dataViewId, filterQuery, groupBy }: PreviewChartPros) {
  const {
    services: { lens },
  } = useKibana();
  const { metrics, timeSize, timeUnit, threshold, equation, comparator } = metricExpression;
  const [attributes, setAttributes] = useState();

  const getOperationTypeFromRuleAggType = (aggType: CustomMetricAggTypes): OperationType => {
    if (aggType === Aggregators.AVERAGE) return 'average';
    if (aggType === Aggregators.CARDINALITY) return 'unique_count';
    return aggType;
  };

  useEffect(() => {
    if (!metrics || metrics.length === 0) {
      return;
    }
    const { field, aggType, name, filter } = metrics[0];
    const lensDoc = new LensDocBuilder();

    if (dataViewId) {
      if (field && aggType) {
        lensDoc
          .addDataLayer({
            layerId: 'main_date_histogram',
            accessors: 'main_date_histogram_accessors',
            xAccessor: 'main_date_histogram_xAccessor',
            dataViewId,
            operationType: getOperationTypeFromRuleAggType(aggType),
            sourceField: field,
            label: '@timestamp',
            groupBy,
          })
          .addQueryFilter(filterQuery);
      }

      if (threshold.length >= 1) {
        lensDoc.addReferenceLayer({
          layerId: 'threshold_layer',
          dataViewId,
          accessors: 'threshold_layer_accessors',
          comparator,
          label: 'threshold_layer',
          value: threshold[0],
        });
      }
    }

    setAttributes(lensDoc.getAttributes());
  }, [comparator, dataViewId, filterQuery, groupBy, metrics, threshold]);

  if (!metrics || metrics.length === 0 || !dataViewId || !attributes || !timeSize) {
    return (
      <div style={{ maxHeight: 180, minHeight: 180 }}>
        <EuiEmptyPrompt
          iconType="visArea"
          title={<h4>Preview chart</h4>}
          titleSize="xs"
          body={<p>No data</p>}
        />
      </div>
    );
  }
  if (metrics.length > 1) {
    // It means have to use formula
  }

  return (
    <div>
      <lens.EmbeddableComponent
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
