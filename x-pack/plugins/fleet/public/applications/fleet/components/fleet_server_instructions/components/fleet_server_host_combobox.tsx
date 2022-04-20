/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

interface Props {
  fleetServerHost: string | undefined;
  fleetServerHostSettings: string[];
  isDisabled: boolean;
  isInvalid: boolean;
  onFleetServerHostChange: (host: string) => void;
}

export const FleetServerHostComboBox: React.FunctionComponent<Props> = ({
  fleetServerHost,
  fleetServerHostSettings,
  isDisabled = false,
  isInvalid = false,
  onFleetServerHostChange,
}) => {
  // Track options that are created inline
  const [createdOptions, setCreatedOptions] = useState<string[]>([]);

  const options = [
    ...createdOptions.map((option) => ({ label: option, value: option })),
    ...fleetServerHostSettings.map((host) => ({ label: host, value: host })),
  ];

  const handleChange = (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
    const host = selectedOptions[0].value ?? '';
    onFleetServerHostChange(host);
  };

  const handleCreateOption = (option: string) => {
    setCreatedOptions([...createdOptions, option]);
    onFleetServerHostChange(option);
  };

  return (
    <EuiComboBox<string>
      fullWidth
      singleSelection={{ asPlainText: true }}
      placeholder="https://fleet-server-host.com:8220"
      options={options}
      customOptionText={i18n.translate(
        'xpack.fleet.fleetServerSetup.addFleetServerHostCustomOptionText',
        {
          defaultMessage: 'Add {searchValuePlaceholder} as a new Fleet Server host',
          values: { searchValuePlaceholder: '{searchValue}' },
        }
      )}
      selectedOptions={fleetServerHost ? [{ label: fleetServerHost, value: fleetServerHost }] : []}
      prepend={
        <EuiText>
          <FormattedMessage
            id="xpack.fleet.fleetServerSetup.addFleetServerHostInputLabel"
            defaultMessage="Fleet Server host"
          />
        </EuiText>
      }
      noSuggestions={fleetServerHostSettings.length === 0}
      data-test-subj="fleetServerHostInput"
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      onChange={handleChange}
      onCreateOption={handleCreateOption}
    />
  );
};
