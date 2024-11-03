/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiPanel,
  EuiText,
  EuiLink,
  EuiSpacer,
  EuiKeyPadMenu,
  EuiKeyPadMenuItem,
  EuiIcon,
  EuiKeyPadMenuItemProps,
} from '@elastic/eui';

export type MonitorTypeRadioGroupProps = EuiKeyPadMenuItemProps & {
  options: MonitorTypeRadioOption[];
  onChange: React.ChangeEvent<HTMLInputElement>;
  name: string;
  value: string;
  ariaLegend: string;
};

export type MonitorTypeRadioOption = EuiKeyPadMenuItemProps & {
  icon: string;
  description: string;
  descriptionTitle: string;
  link: string;
  value: string;
  label: React.ReactNode;
  onChange: (id: string, value: string) => void;
  name: string;
  'data-test-subj': string;
};

export const MonitorType = ({
  id,
  value,
  label,
  icon,
  onChange,
  name,
  isSelected,
  'data-test-subj': dataTestSubj,
}: MonitorTypeRadioOption) => {
  return (
    <EuiKeyPadMenuItem
      checkable="single"
      label={label}
      id={id}
      value={value}
      onChange={onChange}
      name={name}
      isSelected={isSelected}
      data-test-subj={dataTestSubj}
    >
      <EuiIcon type={icon} />
    </EuiKeyPadMenuItem>
  );
};

export const MonitorTypeRadioGroup = ({
  options,
  value,
  name,
  onChange,
  ariaLegend,
  ...props
}: MonitorTypeRadioGroupProps) => {
  const selectedOption = options.find((radio) => radio.value === value);
  return (
    <>
      <EuiKeyPadMenu checkable={{ ariaLegend }} css={{ width: '100%' }}>
        {options.map((radio) => {
          return (
            <MonitorType
              {...props}
              {...radio}
              name={name}
              onChange={onChange}
              isSelected={radio.value === value}
              data-test-subj={radio['data-test-subj']}
              key={radio.value}
            />
          );
        })}
      </EuiKeyPadMenu>
      <EuiSpacer />
      {selectedOption && (
        <EuiPanel color="primary" aria-live="polite">
          <EuiText size="s">
            <h3>{selectedOption.descriptionTitle}</h3>
          </EuiText>
          <EuiText size="s" color="subdued">
            <span>{`${selectedOption.description} `}</span>
            <EuiLink
              data-test-subj="syntheticsMonitorTypeRadioGroupLearnMoreLink"
              href={selectedOption.link}
              target="_blank"
            >
              {i18n.translate('xpack.synthetics.monitorConfig.monitorType.learnMoreLink', {
                defaultMessage: 'Learn more',
              })}
            </EuiLink>
          </EuiText>
          <EuiSpacer size="xs" />
        </EuiPanel>
      )}
    </>
  );
};
