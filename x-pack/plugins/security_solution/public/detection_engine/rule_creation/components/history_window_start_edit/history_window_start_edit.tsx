/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ScheduleItemField } from '../schedule_item_field';
import { UseField } from '../../../../shared_imports';

const COMPONENT_PROPS = {
  idAria: 'historyWindowSize',
  dataTestSubj: 'historyWindowSize',
  timeTypes: ['m', 'h', 'd'],
};

interface HistoryWindowStartEditProps {
  path: string;
}

export function HistoryWindowStartEdit({ path }: HistoryWindowStartEditProps): JSX.Element {
  return <UseField path={path} component={ScheduleItemField} componentProps={COMPONENT_PROPS} />;
}
