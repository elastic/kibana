/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiForm } from '@elastic/eui';
import { DataStream } from '../fleet_package/types';
import { usePolicyConfigContext } from '../fleet_package/contexts';

import { CustomFields } from '../fleet_package/custom_fields';
import { validate } from '../fleet_package/validation';
import { MonitorNameAndLocation } from './monitor_name_location';

export const MonitorFields = () => {
  const { monitorType } = usePolicyConfigContext();
  return (
    <EuiForm id="syntheticsServiceCreateMonitorForm" component="form">
      <CustomFields
        validate={validate[monitorType]}
        dataStreams={[DataStream.HTTP, DataStream.TCP, DataStream.ICMP, DataStream.BROWSER]}
      >
        <MonitorNameAndLocation />
      </CustomFields>
    </EuiForm>
  );
};
