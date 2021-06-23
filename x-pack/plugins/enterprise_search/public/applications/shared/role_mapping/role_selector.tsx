/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFormRow, EuiRadioGroup } from '@elastic/eui';

import { RoleOptionLabel } from './role_option_label';

interface RoleOption {
  id: string;
  description: string;
  disabled?: boolean;
}

interface Props {
  disabled?: boolean;
  roleType?: string;
  roleOptions: RoleOption[];
  label: string;
  onChange(id: string): void;
}

export const RoleSelector: React.FC<Props> = ({ label, roleType, roleOptions, onChange }) => {
  const options = roleOptions.map(({ id, description, disabled }) => ({
    id,
    label: <RoleOptionLabel label={id} description={description} />,
    disabled,
  }));

  return (
    <EuiFormRow>
      <EuiRadioGroup
        options={options}
        idSelected={roleOptions.filter((r) => r.id === roleType)[0].id}
        onChange={(id) => {
          onChange(id);
        }}
        legend={{
          children: <span>{label}</span>,
        }}
      />
    </EuiFormRow>
  );
};
