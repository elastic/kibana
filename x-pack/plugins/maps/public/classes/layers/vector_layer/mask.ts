/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MapGeoJSONFeature } from '@kbn/mapbox-gl';
import { MASK_OPERATOR, MB_LOOKUP_FUNCTION } from '../../../../common/constants';

export class Mask {
  private readonly _isFeatureState: boolean;
  private readonly _mbFieldName: string;
  private readonly _operator: MASK_OPERATOR;
  private readonly _value: number;

  constructor({
    isFeatureState,
    mbFieldName,
    operator,
    value,
  }: {
    isFeatureState: boolean;
    mbFieldName: string;
    operator: MASK_OPERATOR;
    value: number;
  }) {
    this._isFeatureState = isFeatureState;
    this._mbFieldName = mbFieldName;
    this._operator = operator;
    this._value = value;
  }

  getConditionExpression() {
    const comparisionOperator = this._operator === MASK_OPERATOR.BELOW ? '<' : '>';
    const lookup = this._isFeatureState ? MB_LOOKUP_FUNCTION.FEATURE_STATE : MB_LOOKUP_FUNCTION.GET;
    return [comparisionOperator, [lookup, this._mbFieldName], this._value];
  }

  isFeatureMasked(feature: MapGeoJSONFeature) {
    console.log(JSON.stringify(feature, null, ' '));
    const featureValue = this._isFeatureState
      ? feature?.state[this._mbFieldName]
      : feature?.properties[this._mbFieldName];
    console.log(featureValue);
    if (featureValue === undefined || typeof featureValue !== 'number') {
      return false;
    }
    return this._operator === MASK_OPERATOR.BELOW
      ? featureValue < this._value
      : featureValue > this._value;
  }
}
