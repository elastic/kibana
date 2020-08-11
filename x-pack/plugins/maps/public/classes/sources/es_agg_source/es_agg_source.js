/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { AbstractESSource } from '../es_source';
import { esAggFieldsFactory } from '../../fields/es_agg_field';
import { AGG_TYPE, COUNT_PROP_LABEL, FIELD_ORIGIN } from '../../../../common/constants';
import { getSourceAggKey } from '../../../../common/get_agg_key';

export const DEFAULT_METRIC = { type: AGG_TYPE.COUNT };

export class AbstractESAggSource extends AbstractESSource {
  constructor(descriptor, inspectorAdapters) {
    super(descriptor, inspectorAdapters);
    this._metricFields = [];
    if (this._descriptor.metrics) {
      this._descriptor.metrics.forEach((aggDescriptor) => {
        this._metricFields.push(
          ...esAggFieldsFactory(aggDescriptor, this, this.getOriginForField())
        );
      });
    }
  }

  getFieldByName(name) {
    return this.getMetricFieldForName(name);
  }

  createField() {
    throw new Error('Cannot create a new field from just a fieldname for an es_agg_source.');
  }

  hasMatchingMetricField(fieldName) {
    const matchingField = this.getMetricFieldForName(fieldName);
    return !!matchingField;
  }

  getMetricFieldForName(fieldName) {
    return this.getMetricFields().find((metricField) => {
      return metricField.getName() === fieldName;
    });
  }

  getOriginForField() {
    return FIELD_ORIGIN.SOURCE;
  }

  getMetricFields() {
    const metrics = this._metricFields.filter((esAggField) => esAggField.isValid());
    // Handle case where metrics is empty because older saved object state is empty array or there are no valid aggs.
    return metrics.length === 0
      ? esAggFieldsFactory({ type: AGG_TYPE.COUNT }, this, this.getOriginForField())
      : metrics;
  }

  getAggKey(aggType, fieldName) {
    return getSourceAggKey({
      aggType,
      aggFieldName: fieldName,
    });
  }

  getAggLabel(aggType, fieldName) {
    switch (aggType) {
      case AGG_TYPE.COUNT:
        return COUNT_PROP_LABEL;
      case AGG_TYPE.TERMS:
        return i18n.translate('xpack.maps.source.esAggSource.topTermLabel', {
          defaultMessage: `Top {fieldName}`,
          values: { fieldName },
        });
      default:
        return `${aggType} ${fieldName}`;
    }
  }

  async getFields() {
    return this.getMetricFields();
  }

  getValueAggsDsl(indexPattern) {
    const valueAggsDsl = {};
    this.getMetricFields().forEach((esAggMetric) => {
      const aggDsl = esAggMetric.getValueAggDsl(indexPattern);
      if (aggDsl) {
        valueAggsDsl[esAggMetric.getName()] = esAggMetric.getValueAggDsl(indexPattern);
      }
    });
    return valueAggsDsl;
  }

  async filterAndFormatPropertiesToHtmlForMetricFields(properties) {
    const metricFields = this.getMetricFields();
    const tooltipPropertiesPromises = [];
    metricFields.forEach((metricField) => {
      let value;
      for (const key in properties) {
        if (properties.hasOwnProperty(key) && metricField.getName() === key) {
          value = properties[key];
          break;
        }
      }

      const tooltipPromise = metricField.createTooltipProperty(value);
      tooltipPropertiesPromises.push(tooltipPromise);
    });

    return await Promise.all(tooltipPropertiesPromises);
  }
}
