/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ServiceGroupsSortType } from '.';

interface Props {
  type: ServiceGroupsSortType;
  onChange: (type: ServiceGroupsSortType) => void;
}

const options: Array<{
  value: ServiceGroupsSortType;
  text: string;
}> = [
  {
    value: 'recently_added',
    text: i18n.translate('xpack.apm.serviceGroups.list.sort.recentlyAdded', {
      defaultMessage: 'Recently added',
    }),
  },
  {
    value: 'alphabetical',
    text: i18n.translate('xpack.apm.serviceGroups.list.sort.alphabetical', {
      defaultMessage: 'Alphabetical',
    }),
  },
];

export function Sort({ type, onChange }: Props) {
  return (
    <EuiSelect
      options={options}
      value={type}
      onChange={(e) => onChange(e.target.value as ServiceGroupsSortType)}
      prepend={i18n.translate('xpack.apm.serviceGroups.sortLabel', {
        defaultMessage: 'Sort',
      })}
    />
  );
}
