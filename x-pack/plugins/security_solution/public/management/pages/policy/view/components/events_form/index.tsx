/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCheckbox, EuiSpacer, EuiText, htmlIdGenerator } from '@elastic/eui';
import { OperatingSystem, UIPolicyConfig } from '../../../../../../../common/endpoint/types';
import { OS } from '../../../types';
import { ConfigForm, ConfigFormHeading } from '../../components/config_form';

const OPERATING_SYSTEM_TO_TEST_SUBJ: { [K in OperatingSystem]: string } = {
  [OperatingSystem.WINDOWS]: 'Windows',
  [OperatingSystem.LINUX]: 'Linux',
  [OperatingSystem.MAC]: 'Mac',
};

interface OperatingSystemToOsMap {
  [OperatingSystem.WINDOWS]: OS.windows;
  [OperatingSystem.LINUX]: OS.linux;
  [OperatingSystem.MAC]: OS.mac;
}

export type ProtectionField<
  T extends OperatingSystem
> = keyof UIPolicyConfig[OperatingSystemToOsMap[T]]['events'];

export type EventFormSelection<T extends OperatingSystem> = { [K in ProtectionField<T>]: boolean };

export interface EventFormOption<T extends OperatingSystem> {
  name: string;
  protectionField: ProtectionField<T>;
}

export interface EventsFormProps<T extends OperatingSystem> {
  os: T;
  options: ReadonlyArray<EventFormOption<T>>;
  selection: EventFormSelection<T>;
  onValueSelection: (value: ProtectionField<T>, selected: boolean) => void;
}

const countSelected = <T extends OperatingSystem>(selection: EventFormSelection<T>) => {
  return Object.values(selection).filter((value) => value).length;
};

export const EventsForm = <T extends OperatingSystem>({
  os,
  options,
  selection,
  onValueSelection,
}: EventsFormProps<T>) => (
  <ConfigForm
    type={i18n.translate('xpack.securitySolution.endpoint.policy.details.eventCollection', {
      defaultMessage: 'Event Collection',
    })}
    supportedOss={[os]}
    rightCorner={
      <EuiText size="s" color="subdued">
        {i18n.translate('xpack.securitySolution.endpoint.policy.details.eventCollectionsEnabled', {
          defaultMessage: '{selected} / {total} event collections enabled',
          values: { selected: countSelected(selection), total: options.length },
        })}
      </EuiText>
    }
  >
    <ConfigFormHeading>
      {i18n.translate('xpack.securitySolution.endpoint.policyDetailsConfig.eventingEvents', {
        defaultMessage: 'Events',
      })}
    </ConfigFormHeading>
    <EuiSpacer size="s" />
    {options.map(({ name, protectionField }) => (
      <EuiCheckbox
        key={String(protectionField)}
        id={htmlIdGenerator()()}
        label={name}
        data-test-subj={`policy${OPERATING_SYSTEM_TO_TEST_SUBJ[os]}Event_${protectionField}`}
        checked={selection[protectionField]}
        onChange={(event) => onValueSelection(protectionField, event.target.checked)}
      />
    ))}
  </ConfigForm>
);

EventsForm.displayName = 'EventsForm';
