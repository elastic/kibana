/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import { useDispatch } from 'react-redux';
import { OperatingSystem } from '@kbn/securitysolution-utils';
import { policyConfig } from '../../../store/policy_details/selectors';
import { setIn } from '../../../models/policy_details_config';
import { usePolicyDetailsSelector } from '../../policy_hooks';
import { EventFormOption, EventsForm } from '../../components/events_form';

const OPTIONS: ReadonlyArray<EventFormOption<OperatingSystem.WINDOWS>> = [
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

export const WindowsEvents = memo(() => {
  const policyDetailsConfig = usePolicyDetailsSelector(policyConfig);
  const dispatch = useDispatch();

  return (
    <EventsForm<OperatingSystem.WINDOWS>
      os={OperatingSystem.WINDOWS}
      selection={policyDetailsConfig.windows.events}
      options={OPTIONS}
      onValueSelection={(value, selected) =>
        dispatch({
          type: 'userChangedPolicyConfig',
          payload: {
            policyConfig: setIn(policyDetailsConfig)('windows')('events')(value)(selected),
          },
        })
      }
    />
  );
});

WindowsEvents.displayName = 'WindowsEvents';
