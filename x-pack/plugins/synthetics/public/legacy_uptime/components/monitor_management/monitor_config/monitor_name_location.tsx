/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFormRow, EuiFieldText } from '@elastic/eui';
import { ConfigKey } from '../../../../../common/runtime_types';
import { Validation } from '../../../../../common/types';
import { usePolicyConfigContext } from '../../fleet_package/contexts';
import { ServiceLocations } from './locations';
import { useMonitorName } from './use_monitor_name';

interface Props {
  validate?: Validation;
  onFieldBlur?: (field: ConfigKey) => void;
  readOnly?: boolean;
}

export const MonitorNameAndLocation = ({ validate, onFieldBlur, readOnly }: Props) => {
  const { name, setName, locations = [], setLocations } = usePolicyConfigContext();
  const isNameInvalid = validate ? !!validate[ConfigKey.NAME]?.({ [ConfigKey.NAME]: name }) : false;
  const isLocationsInvalid = validate
    ? !!validate[ConfigKey.LOCATIONS]?.({
        [ConfigKey.LOCATIONS]: locations,
      })
    : false;

  const [localName, setLocalName] = useState(name);

  const { validName, nameAlreadyExists } = useMonitorName({ search: localName });

  useEffect(() => {
    setName(validName);
  }, [setName, validName]);

  return (
    <>
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.synthetics.monitorManagement.monitorNameFieldLabel"
            defaultMessage="Monitor name"
          />
        }
        fullWidth={false}
        isInvalid={isNameInvalid || nameAlreadyExists}
        error={
          nameAlreadyExists ? (
            NAME_ALREADY_EXISTS
          ) : (
            <FormattedMessage
              id="xpack.synthetics.monitorManagement.monitorNameFieldError"
              defaultMessage="Monitor name is required"
            />
          )
        }
      >
        <EuiFieldText
          autoFocus={true}
          defaultValue={name}
          required={true}
          isInvalid={isNameInvalid || nameAlreadyExists}
          fullWidth={true}
          name="name"
          onChange={(event) => setLocalName(event.target.value)}
          onBlur={() => onFieldBlur?.(ConfigKey.NAME)}
          data-test-subj="monitorManagementMonitorName"
          readOnly={readOnly}
        />
      </EuiFormRow>
      <ServiceLocations
        setLocations={setLocations}
        selectedLocations={locations}
        isInvalid={isLocationsInvalid}
        onBlur={() => onFieldBlur?.(ConfigKey.LOCATIONS)}
        readOnly={readOnly}
      />
    </>
  );
};

const NAME_ALREADY_EXISTS = i18n.translate(
  'xpack.synthetics.monitorManagement.duplicateNameError',
  {
    defaultMessage: 'Monitor name already exists.',
  }
);
