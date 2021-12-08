/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiFieldText } from '@elastic/eui';
import { usePolicyConfigContext } from '../../fleet_package/contexts';
import { ServiceLocations } from './locations';

export const MonitorNameAndLocation = () => {
  const { name, setName, locations = [], setLocations } = usePolicyConfigContext();
  return (
    <>
      <EuiFormRow label="Monitor name" fullWidth={true}>
        <EuiFieldText
          autoFocus={true}
          defaultValue={name}
          required={true}
          fullWidth={true}
          name="name"
          onChange={(event) => setName(event.target.value)}
        />
      </EuiFormRow>
      <ServiceLocations setLocations={setLocations} selectedLocations={locations} />
    </>
  );
};
