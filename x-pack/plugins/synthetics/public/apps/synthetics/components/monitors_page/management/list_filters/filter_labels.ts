/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { invert } from 'lodash';
import { DataStream, ServiceLocations } from '../../../../../../../common/runtime_types';

export type SyntheticsFilterField =
  | 'tags'
  | 'locations'
  | 'monitorTypes'
  | 'projects'
  | 'schedules';

export interface LabelWithCountValue {
  label: string;
  count: number;
}

export interface SyntheticsFilterItem {
  label: string;
  values: LabelWithCountValue[];
  field: SyntheticsFilterField;
}

export function getSyntheticsFilterDisplayValues(
  values: LabelWithCountValue[],
  field: SyntheticsFilterField,
  locations: ServiceLocations
) {
  switch (field) {
    case 'monitorTypes':
      return values.map(({ label, count }: { label: string; count: number }) => ({
        label: monitorTypeKeyLabelMap[label as DataStream] ?? label,
        count,
      }));
    case 'schedules':
      return values.map(({ label, count }: { label: string; count: number }) => ({
        label: i18n.translate('xpack.synthetics.monitorFilters.frequencyLabel', {
          defaultMessage: `Every {count} minutes`,
          values: { count: label },
        }),
        count,
      }));
    case 'locations':
      return values.map(({ label, count }) => {
        const foundLocation = locations.find(
          ({ id: locationId, label: locationLabel }) =>
            label === locationId || label === locationLabel
        );
        return {
          label: foundLocation?.label ?? label,
          count,
        };
      });
    default:
      return values;
  }
}

export function getSyntheticsFilterKeyForLabel(value: string, field: SyntheticsFilterField) {
  switch (field) {
    case 'monitorTypes':
      return invert(monitorTypeKeyLabelMap)[value] ?? value;
    case 'schedules':
      return (value ?? '').replace(/\D/g, '');
    default:
      return value;
  }
}

const monitorTypeKeyLabelMap: Record<DataStream, string> = {
  [DataStream.BROWSER]: 'Journey / Page',
  [DataStream.HTTP]: 'HTTP',
  [DataStream.TCP]: 'TCP',
  [DataStream.ICMP]: 'ICMP',
};
