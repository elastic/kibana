/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Adapters } from '@kbn/inspector-plugin/public';
import { GeoJsonProperties } from 'geojson';
import { DataView } from '@kbn/data-plugin/common';
import { IESSource } from '../es_source';
import { AbstractESSource } from '../es_source';
import { esAggFieldsFactory, IESAggField } from '../../fields/agg';
import { AGG_TYPE, COUNT_PROP_LABEL, FIELD_ORIGIN } from '../../../../common/constants';
import { getSourceAggKey } from '../../../../common/get_agg_key';
import { AbstractESAggSourceDescriptor, AggDescriptor } from '../../../../common/descriptor_types';
import { IField } from '../../fields/field';
import { ITooltipProperty } from '../../tooltips/tooltip_property';

export const DEFAULT_METRIC = { type: AGG_TYPE.COUNT };

export interface IESAggSource extends IESSource {
  getAggKey(aggType: AGG_TYPE, fieldName: string): string;
  getAggLabel(aggType: AGG_TYPE, fieldLabel: string): string;
  getMetricFields(): IESAggField[];
  getMetricFieldForName(fieldName: string): IESAggField | null;
  getValueAggsDsl(indexPattern: DataView): { [key: string]: unknown };
}

export abstract class AbstractESAggSource extends AbstractESSource implements IESAggSource {
  private readonly _metricFields: IESAggField[];

  static createDescriptor(
    descriptor: Partial<AbstractESAggSourceDescriptor>
  ): AbstractESAggSourceDescriptor {
    const normalizedDescriptor = AbstractESSource.createDescriptor(descriptor);
    return {
      ...normalizedDescriptor,
      type: descriptor.type ? descriptor.type : '',
      metrics:
        descriptor.metrics && descriptor.metrics.length > 0 ? descriptor.metrics : [DEFAULT_METRIC],
    };
  }

  constructor(descriptor: AbstractESAggSourceDescriptor, inspectorAdapters?: Adapters) {
    super(descriptor, inspectorAdapters);
    this._metricFields = [];
    if (descriptor.metrics) {
      descriptor.metrics.forEach((aggDescriptor: AggDescriptor) => {
        this._metricFields.push(
          ...esAggFieldsFactory(aggDescriptor, this, this.getOriginForField())
        );
      });
    }
  }

  getFieldByName(fieldName: string): IField | null {
    return this.getMetricFieldForName(fieldName);
  }

  createField({ fieldName }: { fieldName: string }): IField {
    throw new Error('Cannot create a new field from just a fieldname for an es_agg_source.');
  }

  getMetricFieldForName(fieldName: string): IESAggField | null {
    const targetMetricField = this.getMetricFields().find((metricField: IESAggField) => {
      return metricField.getName() === fieldName;
    });
    return targetMetricField ? targetMetricField : null;
  }

  getOriginForField() {
    return FIELD_ORIGIN.SOURCE;
  }

  getMetricFields(): IESAggField[] {
    const metrics = this._metricFields.filter((esAggField) => esAggField.isValid());
    // Handle case where metrics is empty because older saved object state is empty array or there are no valid aggs.
    return metrics.length === 0
      ? esAggFieldsFactory({ type: AGG_TYPE.COUNT }, this, this.getOriginForField())
      : metrics;
  }

  getAggKey(aggType: AGG_TYPE, fieldName: string): string {
    return getSourceAggKey({
      aggType,
      aggFieldName: fieldName,
    });
  }

  getAggLabel(aggType: AGG_TYPE, fieldLabel: string): string {
    switch (aggType) {
      case AGG_TYPE.COUNT:
        return COUNT_PROP_LABEL;
      case AGG_TYPE.TERMS:
        return i18n.translate('xpack.maps.source.esAggSource.topTermLabel', {
          defaultMessage: `Top {fieldLabel}`,
          values: { fieldLabel },
        });
      default:
        return `${aggType} ${fieldLabel}`;
    }
  }

  async getFields(): Promise<IField[]> {
    return this.getMetricFields();
  }

  getValueAggsDsl(indexPattern: DataView, metricsFilter?: (metric: IESAggField) => boolean) {
    const valueAggsDsl: { [key: string]: unknown } = {};
    this.getMetricFields()
      .filter((esAggMetric) => {
        return metricsFilter ? metricsFilter(esAggMetric) : true;
      })
      .forEach((esAggMetric) => {
        const aggDsl = esAggMetric.getValueAggDsl(indexPattern);
        if (aggDsl) {
          valueAggsDsl[esAggMetric.getName()] = esAggMetric.getValueAggDsl(indexPattern);
        }
      });
    return valueAggsDsl;
  }

  async getTooltipProperties(mbProperties: GeoJsonProperties): Promise<ITooltipProperty[]> {
    const metricFields = await this.getFields();
    const promises: Array<Promise<ITooltipProperty>> = [];
    metricFields.forEach((metricField) => {
      let value;
      for (const key in mbProperties) {
        if (mbProperties.hasOwnProperty(key) && metricField.getMbFieldName() === key) {
          value = mbProperties[key];
          break;
        }
      }

      const tooltipPromise = metricField.createTooltipProperty(value);
      promises.push(tooltipPromise);
    });

    return await Promise.all(promises);
  }
}
