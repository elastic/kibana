/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiButtonGroup, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ServiceGroupsOrientation } from './';

interface Props {
  type: ServiceGroupsOrientation;
  onChange: (type: ServiceGroupsOrientation) => void;
}

const options: Array<{
  id: ServiceGroupsOrientation;
  label: React.ReactNode;
}> = [
  { id: `grid`, label: <EuiIcon type="grid" /> },
  { id: `list`, label: <EuiIcon type="list" /> },
];

export function Orientation({ type, onChange }: Props) {
  return (
    <EuiButtonGroup
      legend={i18n.translate('xpack.apm.serviceGroups.orientation', {
        defaultMessage: 'Service groups orientation',
      })}
      options={options}
      idSelected={type}
      onChange={(id) => onChange(id as ServiceGroupsOrientation)}
    />
  );
}
