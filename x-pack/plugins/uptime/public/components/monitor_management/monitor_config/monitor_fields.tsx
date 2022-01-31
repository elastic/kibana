/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiForm } from '@elastic/eui';
import { DataStream } from '../../../../common/runtime_types';
import { usePolicyConfigContext } from '../../fleet_package/contexts';

import { CustomFields } from '../../fleet_package/custom_fields';
import { validate } from '../validation';
import { MonitorNameAndLocation } from './monitor_name_location';
import { MonitorManagementAdvancedFields } from './monitor_advanced_fields';

export const MonitorFields = () => {
  const { monitorType } = usePolicyConfigContext();
  return (
    <EuiForm id="syntheticsServiceCreateMonitorForm" component="form">
      <CustomFields
        validate={validate[monitorType]}
        dataStreams={[DataStream.HTTP, DataStream.TCP, DataStream.ICMP, DataStream.BROWSER]}
        appendAdvancedFields={<MonitorManagementAdvancedFields validate={validate[monitorType]} />}
      >
        <MonitorNameAndLocation validate={validate[monitorType]} />
      </CustomFields>
    </EuiForm>
  );
};
