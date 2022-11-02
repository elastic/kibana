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
import type { EventFormOption, SupplementalEventFormOption } from '../../components/events_form';
import { EventsForm } from '../../components/events_form';
import type { UIPolicyConfig } from '../../../../../../../common/endpoint/types';

const OPTIONS: ReadonlyArray<EventFormOption<OperatingSystem.LINUX>> = [
  {
    name: i18n.translate('xpack.securitySolution.endpoint.policyDetailsConfig.linux.events.file', {
      defaultMessage: 'File',
    }),
    protectionField: 'file',
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
  {
    name: i18n.translate(
      'xpack.securitySolution.endpoint.policyDetailsConfig.linux.events.process',
      {
        defaultMessage: 'Process',
      }
    ),
    protectionField: 'process',
  },
];

const SUPPLEMENTAL_OPTIONS: ReadonlyArray<SupplementalEventFormOption<OperatingSystem.LINUX>> = [
  {
    title: i18n.translate(
      'xpack.securitySolution.endpoint.policyDetailsConfig.linux.events.session_data.title',
      {
        defaultMessage: 'Session data',
      }
    ),
    description: i18n.translate(
      'xpack.securitySolution.endpoint.policyDetailsConfig.linux.events.session_data.description',
      {
        defaultMessage:
          'Turn this on to capture the extended process data required for Session View. Session View provides you a visual representation of session and process execution data. Session View data is organized according to the Linux process model to help you investigate process, user, and service activity on your Linux infrastructure.',
      }
    ),
    name: i18n.translate(
      'xpack.securitySolution.endpoint.policyDetailsConfig.linux.events.session_data',
      {
        defaultMessage: 'Collect session data',
      }
    ),
    protectionField: 'session_data',
    isDisabled: (config: UIPolicyConfig) => {
      return !config.linux.events.process;
    },
  },
  {
    name: i18n.translate(
      'xpack.securitySolution.endpoint.policyDetailsConfig.linux.events.tty_io',
      {
        defaultMessage: 'Capture terminal output',
      }
    ),
    protectionField: 'tty_io',
    tooltipText: i18n.translate(
      'xpack.securitySolution.endpoint.policyDetailsConfig.linux.events.tty_io.tooltip',
      {
        defaultMessage:
          'Turn this on to collect terminal (tty) output. Terminal output appears in Session View, and you can view it separately to see what commands were executed and how they were typed, provided the terminal is in echo mode. Only works on hosts that support ebpf.',
      }
    ),
    indented: true,
    isDisabled: (config: UIPolicyConfig) => {
      return !config.linux.events.session_data;
    },
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
      onValueSelection={(value, selected) => {
        let newConfig = setIn(policyDetailsConfig)('linux')('events')(value)(selected);

        if (value === 'session_data' && !selected) {
          newConfig = setIn(newConfig)('linux')('events')('tty_io')(false);
        }

        dispatch({
          type: 'userChangedPolicyConfig',
          payload: {
            policyConfig: newConfig,
          },
        });
      }}
    />
  );
});

LinuxEvents.displayName = 'LinuxEvents';
