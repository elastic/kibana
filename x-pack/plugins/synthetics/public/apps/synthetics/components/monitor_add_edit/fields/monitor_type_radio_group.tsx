/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Controller, ControllerRenderProps, FieldValues, useFormContext } from 'react-hook-form';
import {
  EuiCallOut,
  EuiLink,
  EuiSpacer,
  EuiKeyPadMenu,
  EuiKeyPadMenuItem,
  EuiIcon,
} from '@elastic/eui';
import { ConfigKey } from '../types';

export const MonitorType = ({
  id,
  value,
  label,
  icon,
  field,
}: {
  id: string;
  value: string;
  label: string;
  icon: string;
  field: ControllerRenderProps<FieldValues, ConfigKey.MONITOR_TYPE>;
}) => {
  return (
    <EuiKeyPadMenuItem
      checkable="single"
      label={label}
      id={value}
      {...field}
      value={value}
      isSelected={field.value === value}
      onChange={(_, valueT) => {
        field.onChange(valueT);
      }}
    >
      <EuiIcon type={icon} />
    </EuiKeyPadMenuItem>
  );
};

export const MonitorTypeRadioGroup = () => {
  const radios = [
    {
      id: 'id2',
      label: 'Option one',
      value: 'http',
      descriptionTitle: 'Option 1 Title',
      description:
        'A lightweight API check to validate the availability of a web service or endpoint.',
      link: '#',
      icon: 'online',
    },
    {
      id: 'id3',
      label: 'Option twot',
      value: 'icmp',
      descriptionTitle: 'Option 2 Title',
      description:
        'A lightweight API check to validate the availability of a web service or endpoint.',
      link: '#',
      icon: 'online',
    },
    {
      id: 'id1',
      label: 'Option three',
      disabled: true,
      value: 'tcp',
      descriptionTitle: 'Option 3 Title',
      description:
        'A lightweight API check to validate the availability of a web service or endpoint.',
      link: '#',
      icon: 'online',
    },
  ];

  const { control } = useFormContext();

  return (
    <Controller
      control={control}
      name={ConfigKey.MONITOR_TYPE}
      defaultValue={'http'}
      render={({ field }) => {
        const { value } = field;
        const selectedOption = radios.find((radio) => radio.value === value);
        return (
          <>
            <EuiKeyPadMenu checkable={{ ariaLegend: 'Select a monitor type' }}>
              {radios.map((radio) => {
                return <MonitorType field={field} {...radio} />;
              })}
            </EuiKeyPadMenu>
            <EuiSpacer />
            {selectedOption && (
              <EuiCallOut title={selectedOption.descriptionTitle} size="s">
                <span>{selectedOption.description}</span>
                <EuiSpacer size="xs" />
                <EuiLink href={selectedOption.link}>Learn more</EuiLink>
              </EuiCallOut>
            )}
          </>
        );
      }}
    />
  );
};
