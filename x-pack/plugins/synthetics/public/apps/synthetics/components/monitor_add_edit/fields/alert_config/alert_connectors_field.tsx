/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { DefaultConnectorField } from '../../../settings/alerting_defaults/connector_field';
import { useAlertingDefaults } from '../../../settings/alerting_defaults/hooks/use_alerting_defaults';

export interface ConnectorFieldProps {
  ariaLabel: string;
  id: string;
  onChange: (value: string[]) => void;
  value: string[];
  placeholder?: string;
  height?: string;
  readOnly?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  initialValue?: string[];
}

export const AlertConnectorsField = (props: ConnectorFieldProps) => {
  const { value, onChange } = props;

  const isReadOnly = props.readOnly;

  const { defaultConnectors } = useAlertingDefaults();

  return (
    <DefaultConnectorField
      isDisabled={Boolean(isReadOnly)}
      isLoading={false}
      selectedConnectors={value ?? defaultConnectors ?? []}
      onChange={(values) => {
        onChange(values);
      }}
    />
  );
};
