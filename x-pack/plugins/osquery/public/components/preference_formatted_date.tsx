/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment-timezone';
import { useUiSetting } from '../common/lib/kibana';

const PreferenceFormattedDateComponent = ({ value }: { value: Date }) => {
  const dateFormat = useUiSetting<string>('dateFormat');
  console.error('value', value);
  return <>{moment(value).format(dateFormat)}</>;
};
export const PreferenceFormattedDate = React.memo(PreferenceFormattedDateComponent);
