/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiForm, EuiFormRow, EuiFieldText, EuiComboBox } from '@elastic/eui';
import { DataStream } from '../../../fleet_package/types';
import { usePolicyConfigContext } from '../../../fleet_package/contexts';

import { CustomFields } from '../../../fleet_package/custom_fields';
import { validate } from '../../../fleet_package/validation';
import { useServiceLocations } from './use_service_locations';

interface Props {
  name: string;
  setName: React.Dispatch<React.SetStateAction<string>>;
  setLocations: React.Dispatch<React.SetStateAction<string[]>>;
  locations: string[];
}

export const MonitorConfigFlyoutBody = ({
  onChange,
  locations,
  setLocations,
  setName,
  name,
  monitor,
}: Props) => {
  const { monitorType } = usePolicyConfigContext();
  const { locations: serviceLocations } = useServiceLocations();

  const locOpts = Object.entries(serviceLocations).map(([locationName, loc]) => ({
    label: loc.geo.name,
    value: locationName,
  }));
  const modalFormId = 'testForm';

  useEffect(() => {
    if (locOpts.length === 1 && locations.length === 0) {
      setLocations(locOpts.map(({ value }) => value));
    }
  }, [locOpts, locations.length, setLocations]);

  const selectedOpts = locOpts.filter(({ value }) => locations.includes(value));

  return (
    <EuiForm id={modalFormId} component="form">
      <CustomFields
        validate={validate[monitorType]}
        dataStreams={[DataStream.HTTP, DataStream.TCP, DataStream.ICMP, DataStream.BROWSER]}
        monitor={monitor}
      >
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
        <EuiFormRow label={'Service locations'} fullWidth={true}>
          <EuiComboBox
            selectedOptions={selectedOpts}
            fullWidth={true}
            options={locOpts}
            onChange={(selOptions) => setLocations(selOptions.map(({ value }) => value as string))}
          />
        </EuiFormRow>
      </CustomFields>
    </EuiForm>
  );
};
