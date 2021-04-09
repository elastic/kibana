/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiToken } from '@elastic/eui';

import { FieldType } from './types';

interface Props {
  fieldType: FieldType;
}

const fieldTypeToTokenMap = {
  text: 'tokenString',
  string: 'tokenString',
  number: 'tokenNumber',
  float: 'tokenNumber',
  location: 'tokenGeo',
  geolocation: 'tokenGeo',
  date: 'tokenDate',
};

export const ResultToken: React.FC<Props> = ({ fieldType }) => {
  return <EuiToken iconType={fieldTypeToTokenMap[fieldType]} />;
};
