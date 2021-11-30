/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiFieldText } from '@elastic/eui';
import { usePolicyConfigContext } from '../fleet_package/contexts';

export const MonitorNameAndLocation = () => {
  const { name, setName } = usePolicyConfigContext();
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
      {/* TODO: connect locations */}
      {/* <EuiFormRow label={'Service locations'} fullWidth={true}>
        <EuiComboBox
          selectedOptions={selectedOpts}
          fullWidth={true}
          options={locOpts}
          onChange={(selOptions) => setLocations(selOptions.map(({ value }) => value as string))}
        />
      </EuiFormRow> */}
    </>
  );
};
