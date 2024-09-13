/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import { OperatingSystem } from '@kbn/securitysolution-utils';
import type { EventFormOption } from '../event_collection_card';
import { EventCollectionCard } from '../event_collection_card';
import type { PolicyFormComponentCommonProps } from '../../types';

const OPTIONS: ReadonlyArray<EventFormOption<OperatingSystem.WINDOWS>> = [
  {
    name: i18n.translate(
      'xpack.securitySolution.endpoint.policyDetailsConfig.windows.events.credentialAccess',
      {
        defaultMessage: 'API',
      }
    ),
    protectionField: 'credential_access',
  },
  {
    name: i18n.translate(
      'xpack.securitySolution.endpoint.policyDetailsConfig.windows.events.dllDriverLoad',
      {
        defaultMessage: 'DLL and Driver Load',
      }
    ),
    protectionField: 'dll_and_driver_load',
  },
  {
    name: i18n.translate('xpack.securitySolution.endpoint.policyDetailsConfig.windows.events.dns', {
      defaultMessage: 'DNS',
    }),
    protectionField: 'dns',
  },
  {
    name: i18n.translate(
      'xpack.securitySolution.endpoint.policyDetailsConfig.windows.events.file',
      {
        defaultMessage: 'File',
      }
    ),
    protectionField: 'file',
  },
  {
    name: i18n.translate(
      'xpack.securitySolution.endpoint.policyDetailsConfig.windows.events.network',
      {
        defaultMessage: 'Network',
      }
    ),
    protectionField: 'network',
  },
  {
    name: i18n.translate(
      'xpack.securitySolution.endpoint.policyDetailsConfig.windows.events.process',
      {
        defaultMessage: 'Process',
      }
    ),
    protectionField: 'process',
  },
  {
    name: i18n.translate(
      'xpack.securitySolution.endpoint.policyDetailsConfig.windows.events.registry',
      {
        defaultMessage: 'Registry',
      }
    ),
    protectionField: 'registry',
  },
  {
    name: i18n.translate(
      'xpack.securitySolution.endpoint.policyDetailsConfig.windows.events.security',
      {
        defaultMessage: 'Security',
      }
    ),
    protectionField: 'security',
  },
];

export type WindowsEventCollectionCardProps = PolicyFormComponentCommonProps;

export const WindowsEventCollectionCard = memo<WindowsEventCollectionCardProps>((props) => {
  return (
    <EventCollectionCard<OperatingSystem.WINDOWS>
      {...props}
      os={OperatingSystem.WINDOWS}
      selection={props.policy.windows.events}
      options={OPTIONS}
    />
  );
});
WindowsEventCollectionCard.displayName = 'WindowsEventCollectionCard';
