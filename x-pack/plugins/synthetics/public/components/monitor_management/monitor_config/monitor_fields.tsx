/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiForm } from '@elastic/eui';
import { ConfigKey, DataStream } from '../../../../common/runtime_types';
import { usePolicyConfigContext } from '../../fleet_package/contexts';

import { CustomFields } from '../../fleet_package/custom_fields';
import { validate } from '../validation';
import { MonitorNameAndLocation } from './monitor_name_location';
import { MonitorManagementAdvancedFields } from './monitor_advanced_fields';

const MIN_COLUMN_WRAP_WIDTH = '360px';

export const MonitorFields = ({ isFormSubmitted = false }: { isFormSubmitted?: boolean }) => {
  const { monitorType } = usePolicyConfigContext();

  const [touchedFieldsHash, setTouchedFieldsHash] = useState<Record<string, boolean>>({});

  const fieldValidation = useMemo(() => {
    const validatorsHash = { ...validate[monitorType] };
    if (!isFormSubmitted) {
      Object.keys(validatorsHash).map((key) => {
        if (!touchedFieldsHash[key]) {
          validatorsHash[key as ConfigKey] = undefined;
        }
      });
    }

    return validatorsHash;
  }, [isFormSubmitted, monitorType, touchedFieldsHash]);

  const handleFieldBlur = (field: ConfigKey) => {
    setTouchedFieldsHash((hash) => ({ ...hash, [field]: true }));
  };

  return (
    <EuiForm id="syntheticsServiceCreateMonitorForm" component="form">
      <CustomFields
        minColumnWidth={MIN_COLUMN_WRAP_WIDTH}
        validate={fieldValidation}
        dataStreams={[DataStream.HTTP, DataStream.TCP, DataStream.ICMP, DataStream.BROWSER]}
        appendAdvancedFields={
          <MonitorManagementAdvancedFields
            validate={fieldValidation}
            minColumnWidth={MIN_COLUMN_WRAP_WIDTH}
            onFieldBlur={handleFieldBlur}
          />
        }
        onFieldBlur={handleFieldBlur}
      >
        <MonitorNameAndLocation validate={fieldValidation} onFieldBlur={handleFieldBlur} />
      </CustomFields>
    </EuiForm>
  );
};
