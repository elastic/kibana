/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { BreakdownGroup } from './BreakdownGroup';
import { BreakdownItem } from '../../../../../typings/ui_filters';
import {
  CLIENT_GEO_COUNTRY_ISO_CODE,
  USER_AGENT_DEVICE,
  USER_AGENT_NAME,
  USER_AGENT_OS,
} from '../../../../../common/elasticsearch_fieldnames';

interface Props {
  id: string;
  selectedBreakdowns: BreakdownItem[];
  onBreakdownChange: (values: BreakdownItem[]) => void;
}

export const BreakdownFilter = ({
  id,
  selectedBreakdowns,
  onBreakdownChange,
}: Props) => {
  const categories: BreakdownItem[] = [
    {
      name: 'Browser',
      type: 'category',
      count: 0,
      selected: selectedBreakdowns.some(({ name }) => name === 'Browser'),
      fieldName: USER_AGENT_NAME,
    },
    {
      name: 'OS',
      type: 'category',
      count: 0,
      selected: selectedBreakdowns.some(({ name }) => name === 'OS'),
      fieldName: USER_AGENT_OS,
    },
    {
      name: 'Device',
      type: 'category',
      count: 0,
      selected: selectedBreakdowns.some(({ name }) => name === 'Device'),
      fieldName: USER_AGENT_DEVICE,
    },
    {
      name: 'Location',
      type: 'category',
      count: 0,
      selected: selectedBreakdowns.some(({ name }) => name === 'Location'),
      fieldName: CLIENT_GEO_COUNTRY_ISO_CODE,
    },
  ];

  return (
    <BreakdownGroup
      id={id}
      items={categories}
      onChange={(selValues: BreakdownItem[]) => {
        onBreakdownChange(selValues);
      }}
    />
  );
};
