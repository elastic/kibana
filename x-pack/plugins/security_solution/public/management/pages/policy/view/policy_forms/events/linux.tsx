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
import {
  EventFormOption,
  EventsForm,
  SupplementalEventFormOption,
} from '../../components/events_form';

const OPTIONS: ReadonlyArray<EventFormOption<OperatingSystem.LINUX>> = [
  {
    name: i18n.translate('xpack.securitySolution.endpoint.policyDetailsConfig.linux.events.file', {
      defaultMessage: 'File',
    }),
    protectionField: 'file',
  },
  {
    name: i18n.translate(
      'xpack.securitySolution.endpoint.policyDetailsConfig.linux.events.process',
      {
        defaultMessage: 'Process',
      }
    ),
    protectionField: 'process',
  },
  {
    name: i18n.translate(
      'xpack.securitySolution.endpoint.policyDetailsConfig.linux.events.network',
      {
        defaultMessage: 'Network',
      }
    ),
    protectionField: 'network',
  },
];

const SUPPLEMENTAL_OPTIONS: ReadonlyArray<SupplementalEventFormOption<OperatingSystem.LINUX>> = [
  {
    name: i18n.translate(
      'xpack.securitySolution.endpoint.policyDetailsConfig.linux.events.session_data',
      {
        defaultMessage: 'Include session data',
      }
    ),
    protectionField: 'session_data',
    tooltipText: i18n.translate(
      'xpack.securitySolution.endpoint.policyDetailsConfig.linux.events.session_data.tooltip',
      {
        defaultMessage:
          'Capture the extended process event data required for Session View. Session View helps you investigate process, user, and service activity on your Linux infrastructure by showing you time-ordered series of process executions, organized in a tree according to the Linux process model. NOTE: Capturing extended process events substantially increases data usage.',
      }
    ),
    beta: true,
  },
];

export const LinuxEvents = memo(() => {
  const policyDetailsConfig = usePolicyDetailsSelector(policyConfig);
  const dispatch = useDispatch();

  return (
    <EventsForm<OperatingSystem.LINUX>
      os={OperatingSystem.LINUX}
      selection={policyDetailsConfig.linux.events}
      options={OPTIONS}
      supplementalOptions={SUPPLEMENTAL_OPTIONS}
      onValueSelection={(value, selected) =>
        dispatch({
          type: 'userChangedPolicyConfig',
          payload: { policyConfig: setIn(policyDetailsConfig)('linux')('events')(value)(selected) },
        })
      }
    />
  );
});

LinuxEvents.displayName = 'LinuxEvents';
