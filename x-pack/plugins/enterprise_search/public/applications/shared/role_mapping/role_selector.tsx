/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { startCase } from 'lodash';

import {
  EuiCallOut,
  EuiFormRow,
  EuiRadio,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';

interface IRoleSelectorProps {
  disabled?: boolean;
  disabledText?: string;
  roleType?: string;
  roleTypeOption: string;
  description: string;
  onChange(roleTypeOption: string): void;
}

export const RoleSelector: React.FC<IRoleSelectorProps> = ({
  disabled,
  disabledText,
  roleType,
  roleTypeOption,
  description,
  onChange,
}) => (
  <EuiFormRow>
    <EuiRadio
      disabled={disabled}
      id={roleTypeOption}
      checked={roleTypeOption === roleType}
      onChange={() => {
        onChange(roleTypeOption);
      }}
      label={
        <>
          <EuiTitle size="xs">
            <h4 className="users-layout__users--roletype">{startCase(roleTypeOption)}</h4>
          </EuiTitle>
          {disabled && disabledText && (
            <EuiCallOut
              size="s"
              title={<EuiTextColor color="subdued">{disabledText}</EuiTextColor>}
              iconType="alert"
            />
          )}
          <EuiSpacer size="xs" />
          <EuiText size="s">
            <p>{description}</p>
          </EuiText>
        </>
      }
    />
  </EuiFormRow>
);
