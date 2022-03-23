/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line max-classes-per-file
import React, { ReactNode } from 'react';
import { escape } from 'lodash';
import { i18n } from '@kbn/i18n';
import { Filter } from '@kbn/es-query';
import { IField, IVectorSource } from '../../../maps/public';
import { FIELD_ORIGIN, DECIMAL_DEGREES_PRECISION } from '../../../maps/common';
import { TileMetaFeature } from '../../../maps/common/descriptor_types';
import { AnomalySource } from './anomaly_source';
import { ITooltipProperty } from '../../../maps/public';

export const ACTUAL_LABEL = i18n.translate('xpack.ml.maps.anomalyLayerActualLabel', {
  defaultMessage: 'Actual',
});
export const TYPICAL_LABEL = i18n.translate('xpack.ml.maps.anomalyLayerTypicalLabel', {
  defaultMessage: 'Typical',
});
export const TYPICAL_TO_ACTUAL = i18n.translate('xpack.ml.maps.anomalyLayerTypicalToActualLabel', {
  defaultMessage: 'Typical to actual',
});

const INFLUENCER_LIMIT = 3;

export const ANOMALY_SOURCE_FIELDS: Record<string, Record<string, string>> = {
  record_score: {
    label: i18n.translate('xpack.ml.maps.anomalyLayerRecordScoreLabel', {
      defaultMessage: 'Record score',
    }),
    type: 'number',
  },
  timestamp: {
    label: i18n.translate('xpack.ml.maps.anomalyLayerTimeStampLabel', {
      defaultMessage: 'Time',
    }),
    type: 'string',
  },
  fieldName: {
    label: i18n.translate('xpack.ml.maps.anomalyLayerFieldNameLabel', {
      defaultMessage: 'Field name',
    }),
    type: 'string',
  },
  functionDescription: {
    label: i18n.translate('xpack.ml.maps.anomalyLayerFunctionDescriptionLabel', {
      defaultMessage: 'Function',
    }),
    type: 'string',
  },
  actual: {
    label: ACTUAL_LABEL,
    type: 'string',
  },
  typical: {
    label: TYPICAL_LABEL,
    type: 'string',
  },
  partition_field_name: {
    label: i18n.translate('xpack.ml.maps.anomalyLayerPartitionFieldNameLabel', {
      defaultMessage: 'Partition field name',
    }),
    type: 'string',
  },
  partition_field_value: {
    label: i18n.translate('xpack.ml.maps.anomalyLayerPartitionFieldValueLabel', {
      defaultMessage: 'Partition field value',
    }),
    type: 'string',
  },
  by_field_name: {
    label: i18n.translate('xpack.ml.maps.anomalyLayerByFieldNameLabel', {
      defaultMessage: 'By field name',
    }),
    type: 'string',
  },
  by_field_value: {
    label: i18n.translate('xpack.ml.maps.anomalyLayerByFieldValueLabel', {
      defaultMessage: 'By field value',
    }),
    type: 'string',
  },
  over_field_name: {
    label: i18n.translate('xpack.ml.maps.anomalyLayerOverFieldNameLabel', {
      defaultMessage: 'Over field name',
    }),
    type: 'string',
  },
  over_field_value: {
    label: i18n.translate('xpack.ml.maps.anomalyLayerOverFieldValueLabel', {
      defaultMessage: 'Over field value',
    }),
    type: 'string',
  },
  influencers: {
    label: i18n.translate('xpack.ml.maps.anomalyLayerInfluencersLabel', {
      defaultMessage: 'Influencers',
    }),
    type: 'string',
  },
};

const ROUND_POWER = Math.pow(10, DECIMAL_DEGREES_PRECISION);
function roundCoordinate(coordinate: number) {
  return Math.round(Number(coordinate) * ROUND_POWER) / ROUND_POWER;
}

export class AnomalySourceTooltipProperty implements ITooltipProperty {
  constructor(private readonly _field: string, private readonly _value: string) {}

  async getESFilters(): Promise<Filter[]> {
    return [];
  }

  getHtmlDisplayValue(): string | ReactNode {
    if (this._field === 'influencers') {
      try {
        const influencers = JSON.parse(this._value) as Array<{
          influencer_field_name: string;
          influencer_field_values: string[];
        }>;
        return (
          <ul>
            {influencers.map(({ influencer_field_name: name, influencer_field_values: values }) => {
              return <li>{`${name}: ${values.slice(0, INFLUENCER_LIMIT).join(', ')}`}</li>;
            })}
          </ul>
        );
      } catch (error) {
        // ignore error and display unformated value
      }
    } else if (this._field === 'actual' || this._field === 'typical') {
      try {
        const point = JSON.parse(this._value) as number[];
        return `[${roundCoordinate(point[0])}, ${roundCoordinate(point[1])}]`;
      } catch (error) {
        // ignore error and display unformated value
      }
    }

    return this._value.toString();
  }

  getPropertyKey(): string {
    return this._field;
  }

  getPropertyName(): string {
    return ANOMALY_SOURCE_FIELDS[this._field] && ANOMALY_SOURCE_FIELDS[this._field].label
      ? ANOMALY_SOURCE_FIELDS[this._field].label
      : this._field;
  }

  getRawValue(): string | string[] | undefined {
    return this._value.toString();
  }

  isFilterable(): boolean {
    return false;
  }
}

// this needs to be generic so it works for all fields in anomaly record result
export class AnomalySourceField implements IField {
  private readonly _source: AnomalySource;
  private readonly _field: string;

  constructor({ source, field }: { source: AnomalySource; field: string }) {
    this._source = source;
    this._field = field;
  }

  async createTooltipProperty(value: string | string[] | undefined): Promise<ITooltipProperty> {
    return new AnomalySourceTooltipProperty(
      this._field,
      escape(Array.isArray(value) ? value.join() : value ? value : '')
    );
  }

  async getDataType(): Promise<string> {
    return ANOMALY_SOURCE_FIELDS[this._field].type;
  }

  async getLabel(): Promise<string> {
    return ANOMALY_SOURCE_FIELDS[this._field].label;
  }

  getName(): string {
    return this._field;
  }

  getMbFieldName(): string {
    return this.getName();
  }

  getOrigin(): FIELD_ORIGIN {
    return FIELD_ORIGIN.SOURCE;
  }

  getRootName(): string {
    return this.getName();
  }

  getSource(): IVectorSource {
    return this._source;
  }

  isEqual(field: IField): boolean {
    return this.getName() === field.getName();
  }

  isValid(): boolean {
    return true;
  }

  supportsFieldMetaFromLocalData(): boolean {
    return true;
  }

  supportsFieldMetaFromEs(): boolean {
    return false;
  }

  canValueBeFormatted(): boolean {
    return false;
  }

  async getExtendedStatsFieldMetaRequest(): Promise<unknown> {
    return null;
  }

  async getPercentilesFieldMetaRequest(percentiles: number[]): Promise<unknown> {
    return null;
  }

  async getCategoricalFieldMetaRequest(size: number): Promise<unknown> {
    return null;
  }

  pluckRangeFromTileMetaFeature(metaFeature: TileMetaFeature): { min: number; max: number } | null {
    return null;
  }

  isCount(): boolean {
    return false;
  }
}
