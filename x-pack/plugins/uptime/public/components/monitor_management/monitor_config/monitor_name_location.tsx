/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFormRow, EuiFieldText } from '@elastic/eui';
import { ConfigKey } from '../../../../common/runtime_types';
import { Validation } from '../../../../common/types';
import { usePolicyConfigContext } from '../../fleet_package/contexts';
import { ServiceLocations } from './locations';

interface Props {
  validate: Validation;
}

export const MonitorNameAndLocation = ({ validate }: Props) => {
  const { name, setName, locations = [], setLocations } = usePolicyConfigContext();
  const isNameInvalid = !!validate[ConfigKey.NAME]?.({ [ConfigKey.NAME]: name });
  const isLocationsInvalid = !!validate[ConfigKey.LOCATIONS]?.({
    [ConfigKey.LOCATIONS]: locations,
  });

  return (
    <>
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.uptime.monitorManagement.monitorNameFieldLabel"
            defaultMessage="Monitor name"
          />
        }
        fullWidth={true}
        isInvalid={isNameInvalid}
        error={
          <FormattedMessage
            id="xpack.uptime.monitorManagement.monitorNameFieldError"
            defaultMessage="Monitor name is required"
          />
        }
      >
        <EuiFieldText
          autoFocus={true}
          defaultValue={name}
          required={true}
          isInvalid={isNameInvalid}
          fullWidth={true}
          name="name"
          onChange={(event) => setName(event.target.value)}
          data-test-subj="monitorManagementMonitorName"
        />
      </EuiFormRow>
      <ServiceLocations
        setLocations={setLocations}
        selectedLocations={locations}
        isInvalid={isLocationsInvalid}
      />
    </>
  );
};
