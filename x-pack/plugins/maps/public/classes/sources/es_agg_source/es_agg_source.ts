/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { Adapters } from 'src/plugins/inspector/public';
import { GeoJsonProperties } from 'geojson';
import { IESSource } from '../es_source';
import { AbstractESSource } from '../es_source';
import { esAggFieldsFactory } from '../../fields/es_agg_field';
import { AGG_TYPE, COUNT_PROP_LABEL, FIELD_ORIGIN } from '../../../../common/constants';
import { IESAggField } from '../../fields/es_agg_field';
import { getSourceAggKey } from '../../../../common/get_agg_key';
import { AbstractESAggSourceDescriptor, AggDescriptor } from '../../../../common/descriptor_types';
import { IndexPattern } from '../../../../../../../src/plugins/data/public';
import { IField } from '../../fields/field';
import { ITooltipProperty } from '../../tooltips/tooltip_property';

export const DEFAULT_METRIC = { type: AGG_TYPE.COUNT };

export interface IESAggSource extends IESSource {
  getAggKey(aggType: AGG_TYPE, fieldName: string): string;
  getAggLabel(aggType: AGG_TYPE, fieldName: string): string;
  getMetricFields(): IESAggField[];
  hasMatchingMetricField(fieldName: string): boolean;
  getMetricFieldForName(fieldName: string): IESAggField | null;
  getValueAggsDsl(indexPattern: IndexPattern): { [key: string]: unknown };
}

export abstract class AbstractESAggSource extends AbstractESSource {
  private readonly _metricFields: IESAggField[];
  private readonly _canReadFromGeoJson: boolean;

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

  constructor(
    descriptor: AbstractESAggSourceDescriptor,
    inspectorAdapters?: Adapters,
    canReadFromGeoJson = true
  ) {
    super(descriptor, inspectorAdapters);
    this._metricFields = [];
    this._canReadFromGeoJson = canReadFromGeoJson;
    if (descriptor.metrics) {
      descriptor.metrics.forEach((aggDescriptor: AggDescriptor) => {
        this._metricFields.push(
          ...esAggFieldsFactory(
            aggDescriptor,
            this,
            this.getOriginForField(),
            this._canReadFromGeoJson
          )
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

  hasMatchingMetricField(fieldName: string): boolean {
    const matchingField = this.getMetricFieldForName(fieldName);
    return !!matchingField;
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
      ? esAggFieldsFactory(
          { type: AGG_TYPE.COUNT },
          this,
          this.getOriginForField(),
          this._canReadFromGeoJson
        )
      : metrics;
  }

  getAggKey(aggType: AGG_TYPE, fieldName: string): string {
    return getSourceAggKey({
      aggType,
      aggFieldName: fieldName,
    });
  }

  getAggLabel(aggType: AGG_TYPE, fieldName: string): string {
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

  async getFields(): Promise<IField[]> {
    return this.getMetricFields();
  }

  getValueAggsDsl(indexPattern: IndexPattern) {
    const valueAggsDsl: { [key: string]: unknown } = {};
    this.getMetricFields().forEach((esAggMetric) => {
      const aggDsl = esAggMetric.getValueAggDsl(indexPattern);
      if (aggDsl) {
        valueAggsDsl[esAggMetric.getName()] = esAggMetric.getValueAggDsl(indexPattern);
      }
    });
    return valueAggsDsl;
  }

  async getTooltipProperties(properties: GeoJsonProperties): Promise<ITooltipProperty[]> {
    const metricFields = await this.getFields();
    const promises: Array<Promise<ITooltipProperty>> = [];
    metricFields.forEach((metricField) => {
      let value;
      for (const key in properties) {
        if (properties.hasOwnProperty(key) && metricField.getName() === key) {
          value = properties[key];
          break;
        }
      }

      const tooltipPromise = metricField.createTooltipProperty(value);
      promises.push(tooltipPromise);
    });

    return await Promise.all(promises);
  }
}
