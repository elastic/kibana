/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useMemo } from 'react';
import { Option, MultiselectPicker } from '../../../../components/multi_select_picker';

export const ML_JOB_FIELD_TYPES = {
  BOOLEAN: 'boolean',
  DATE: 'date',
  GEO_POINT: 'geo_point',
  IP: 'ip',
  KEYWORD: 'keyword',
  NUMBER: 'number',
  TEXT: 'text',
  UNKNOWN: 'unknown',
} as const;

export type MlJobFieldType = typeof ML_JOB_FIELD_TYPES[keyof typeof ML_JOB_FIELD_TYPES];

export const ML_JOB_FIELD_TYPES_OPTIONS = {
  [ML_JOB_FIELD_TYPES.BOOLEAN]: { name: 'Boolean', icon: 'tokenBoolean' },
  [ML_JOB_FIELD_TYPES.DATE]: { name: 'Date', icon: 'tokenDate' },
  [ML_JOB_FIELD_TYPES.GEO_POINT]: { name: 'Geo point', icon: 'tokenGeo' },
  [ML_JOB_FIELD_TYPES.IP]: { name: 'IP address', icon: 'tokenIP' },
  [ML_JOB_FIELD_TYPES.KEYWORD]: { name: 'Keyword', icon: 'tokenKeyword' },
  [ML_JOB_FIELD_TYPES.NUMBER]: { name: 'Number', icon: 'tokenNumber' },
  [ML_JOB_FIELD_TYPES.TEXT]: { name: 'Text', icon: 'tokenString' },
  [ML_JOB_FIELD_TYPES.UNKNOWN]: { name: 'Unknown' },
};

export const DatavisualizerFieldTypeFilter: FC<{
  indexedFieldTypes: MlJobFieldType[];
}> = ({ indexedFieldTypes }) => {
  const options: Option[] = useMemo(() => {
    return indexedFieldTypes.map((indexedFieldName) => ({
      ...ML_JOB_FIELD_TYPES_OPTIONS[indexedFieldName],
      type: indexedFieldName,
    }));
  }, [indexedFieldTypes]);
  return <MultiselectPicker options={options} onChange={() => {}} />;
};
