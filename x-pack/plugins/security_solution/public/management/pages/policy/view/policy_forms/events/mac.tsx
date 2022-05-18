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

const OPTIONS: ReadonlyArray<EventFormOption<OperatingSystem.MAC>> = [
  {
    name: i18n.translate('xpack.securitySolution.endpoint.policyDetailsConfig.mac.events.file', {
      defaultMessage: 'File',
    }),
    protectionField: 'file',
  },
  {
    name: i18n.translate('xpack.securitySolution.endpoint.policyDetailsConfig.mac.events.process', {
      defaultMessage: 'Process',
    }),
    protectionField: 'process',
  },
  {
    name: i18n.translate('xpack.securitySolution.endpoint.policyDetailsConfig.mac.events.network', {
      defaultMessage: 'Network',
    }),
    protectionField: 'network',
  },
];

export const MacEvents = memo(() => {
  const policyDetailsConfig = usePolicyDetailsSelector(policyConfig);
  const dispatch = useDispatch();

  return (
    <EventsForm<OperatingSystem.MAC>
      os={OperatingSystem.MAC}
      selection={policyDetailsConfig.mac.events}
      options={OPTIONS}
      onValueSelection={(value, selected) =>
        dispatch({
          type: 'userChangedPolicyConfig',
          payload: { policyConfig: setIn(policyDetailsConfig)('mac')('events')(value)(selected) },
        })
      }
    />
  );
});

MacEvents.displayName = 'MacEvents';
