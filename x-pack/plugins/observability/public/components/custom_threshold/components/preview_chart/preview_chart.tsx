/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useEffect } from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { OperationType } from '@kbn/lens-plugin/public';
import { DataView } from '@kbn/data-views-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  Aggregators,
  CustomMetricAggTypes,
} from '../../../../../common/custom_threshold_rule/types';
import LensDocBuilder from './lens_doc_builder';
import { useKibana } from '../../../../utils/kibana_react';
import { MetricExpression } from '../../types';

interface PreviewChartPros {
  metricExpression: MetricExpression;
  dataView?: DataView;
  filterQuery?: string;
  groupBy?: string | string[];
}

function PreviewChart({ metricExpression, dataView, filterQuery, groupBy }: PreviewChartPros) {
  const {
    services: { lens },
  } = useKibana();
  const { metrics, timeSize, timeUnit, threshold, comparator } = metricExpression;
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
    const { field, aggType, filter } = metrics[0];
    const lensDoc = new LensDocBuilder();
    let sourceField = field;

    if (aggType === Aggregators.COUNT) {
      sourceField = '___records___';
    }

    if (dataView?.id && aggType) {
      if (sourceField) {
        console.log('comparator', comparator);
        console.log('threshold', threshold);

        lensDoc
          .addDataLayer({
            layerId: 'main_date_histogram',
            accessors: 'main_date_histogram_accessors',
            xAccessor: 'main_date_histogram_xAccessor',
            dataViewId: dataView.id,
            timeFieldName: dataView.timeFieldName,
            operationType: getOperationTypeFromRuleAggType(aggType),
            sourceField,
            label: `${aggType} ${field}`,
            groupBy,
            query: filter,
          })
          .addQueryFilter(filterQuery);
        if (threshold.length > 0) {
          lensDoc.addReferenceLayer({
            layerId: 'threshold_layer',
            dataViewId: dataView.id,
            accessors: 'threshold_layer_accessors',
            comparator,
            label: 'threshold_layer',
            value: threshold[0],
          });
        }
        setAttributes(lensDoc.getAttributes());
      } else {
        setAttributes(undefined);
      }
    }
  }, [comparator, dataView, filterQuery, groupBy, metrics, threshold]);

  if (!metrics || metrics.length === 0 || !dataView || !attributes || !timeSize) {
    return (
      <div style={{ maxHeight: 180, minHeight: 180 }}>
        <EuiEmptyPrompt
          iconType="visArea"
          titleSize="xs"
          body={
            <FormattedMessage
              id="xpack.observability.customThreshold.rule..charts.noDataMessage"
              defaultMessage="No chart data available"
            />
          }
        />
      </div>
    );
  }
  // TODO: Equations e.g. A + B
  if (metrics.length > 1) {
    return (
      <div style={{ maxHeight: 180, minHeight: 180 }}>
        <EuiEmptyPrompt
          iconType="visArea"
          titleSize="xs"
          body={
            <FormattedMessage
              id="xpack.observability.customThreshold.rule..charts.noDataMessageForEquation"
              defaultMessage="Chart doesn't support equations, yet"
            />
          }
        />
      </div>
    );
  }

  return (
    <div>
      <lens.EmbeddableComponent
        id="customThresholdPreviewChart"
        style={{ height: 180 }}
        timeRange={{ from: `now-${timeSize}${timeUnit}`, to: 'now' }}
        attributes={attributes}
      />
    </div>
  );
}
// eslint-disable-next-line import/no-default-export
export default PreviewChart; // Correct export
