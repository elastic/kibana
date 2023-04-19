/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { MapGeoJSONFeature } from '@kbn/mapbox-gl';
import { IESAggField } from '../../fields/agg';
import { MASK_OPERATOR, MB_LOOKUP_FUNCTION } from '../../../../common/constants';

export const BELOW = i18n.translate('xpack.maps.mask.belowLabel', {
  defaultMessage: 'below',
});

export const ABOVE = i18n.translate('xpack.maps.mask.aboveLabel', {
  defaultMessage: 'above',
});

export const BUCKETS = i18n.translate('xpack.maps.mask.genericBucketsName', {
  defaultMessage: 'buckets',
});

export const VALUE = i18n.translate('xpack.maps.mask.genericAggLabel', {
  defaultMessage: 'value',
});

function getOperatorLabel(operator: MASK_OPERATOR): string {
  if (operator === MASK_OPERATOR.BELOW) {
    return BELOW;
  }

  if (operator === MASK_OPERATOR.ABOVE) {
    return ABOVE;
  }

  return operator as string;
}

export function getMaskI18nValue(operator: MASK_OPERATOR, value: number): string {
  return `${getOperatorLabel(operator)} ${value}`;
}

export function getMaskI18nDescription({
  aggLabel,
  bucketsName,
  isJoin,
}: {
  aggLabel?: string;
  bucketsName?: string;
  isJoin: boolean;
}): string {
  return isJoin
    ? i18n.translate('xpack.maps.mask.maskJoinDescription', {
        defaultMessage: 'hide features when join metric {aggLabel} is ',
        values: {
          aggLabel: aggLabel ? aggLabel : VALUE,
        },
      })
    : i18n.translate('xpack.maps.mask.maskDescription', {
        defaultMessage: 'hide {bucketsName} when {aggLabel} is ',
        values: {
          bucketsName: bucketsName ? bucketsName : BUCKETS,
          aggLabel: aggLabel ? aggLabel : VALUE,
        },
      });
}

export class Mask {
  private readonly _isFeatureState: boolean;
  private readonly _esAggField: IESAggField;
  private readonly _operator: MASK_OPERATOR;
  private readonly _value: number;

  constructor({
    esAggField,
    isFeatureState,
    operator,
    value,
  }: {
    esAggField: IESAggField;
    isFeatureState: boolean;
    operator: MASK_OPERATOR;
    value: number;
  }) {
    this._esAggField = esAggField;
    this._isFeatureState = isFeatureState;
    this._operator = operator;
    this._value = value;
  }

  /*
   * Returns maplibre expression that matches masked features
   */
  getConditionExpression() {
    const comparisionOperator = this._operator === MASK_OPERATOR.BELOW ? '<' : '>';
    const lookup = this._isFeatureState ? MB_LOOKUP_FUNCTION.FEATURE_STATE : MB_LOOKUP_FUNCTION.GET;
    return [comparisionOperator, [lookup, this._esAggField.getMbFieldName()], this._value];
  }

  getEsAggField() {
    return this._esAggField;
  }

  getOperator() {
    return this._operator;
  }

  getValue() {
    return this._value;
  }

  isFeatureMasked(feature: MapGeoJSONFeature) {
    const featureValue = this._isFeatureState
      ? feature?.state[this._esAggField.getMbFieldName()]
      : feature?.properties[this._esAggField.getMbFieldName()];
    if (typeof featureValue !== 'number') {
      return false;
    }
    return this._operator === MASK_OPERATOR.BELOW
      ? featureValue < this._value
      : featureValue > this._value;
  }
}
