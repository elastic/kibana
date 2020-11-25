/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiText, EuiSpacer } from '@elastic/eui';
import { EventsCheckbox } from './checkbox';
import { OS } from '../../../types';
import { usePolicyDetailsSelector } from '../../policy_hooks';
import { selectedWindowsEvents, totalWindowsEvents } from '../../../store/policy_details/selectors';
import { ConfigForm, ConfigFormHeading } from '../../components/config_form';
import { setIn, getIn } from '../../../models/policy_details_config';
import { UIPolicyConfig, Immutable } from '../../../../../../../common/endpoint/types';
import {
  COLLECTIONS_ENABLED_MESSAGE,
  EVENTS_FORM_TYPE_LABEL,
  EVENTS_HEADING,
} from './translations';

export const WindowsEvents = React.memo(() => {
  const selected = usePolicyDetailsSelector(selectedWindowsEvents);
  const total = usePolicyDetailsSelector(totalWindowsEvents);

  const checkboxes = useMemo(() => {
    const items: Immutable<Array<{
      name: string;
      os: 'windows';
      protectionField: keyof UIPolicyConfig['windows']['events'];
    }>> = [
      {
        name: i18n.translate(
          'xpack.securitySolution.endpoint.policyDetailsConfig.windows.events.dllDriverLoad',
          {
            defaultMessage: 'DLL and Driver Load',
          }
        ),
        os: OS.windows,
        protectionField: 'dll_and_driver_load',
      },
      {
        name: i18n.translate(
          'xpack.securitySolution.endpoint.policyDetailsConfig.windows.events.dns',
          {
            defaultMessage: 'DNS',
          }
        ),
        os: OS.windows,
        protectionField: 'dns',
      },
      {
        name: i18n.translate(
          'xpack.securitySolution.endpoint.policyDetailsConfig.windows.events.file',
          {
            defaultMessage: 'File',
          }
        ),
        os: OS.windows,
        protectionField: 'file',
      },
      {
        name: i18n.translate(
          'xpack.securitySolution.endpoint.policyDetailsConfig.windows.events.network',
          {
            defaultMessage: 'Network',
          }
        ),
        os: OS.windows,
        protectionField: 'network',
      },
      {
        name: i18n.translate(
          'xpack.securitySolution.endpoint.policyDetailsConfig.windows.events.process',
          {
            defaultMessage: 'Process',
          }
        ),
        os: OS.windows,
        protectionField: 'process',
      },
      {
        name: i18n.translate(
          'xpack.securitySolution.endpoint.policyDetailsConfig.windows.events.registry',
          {
            defaultMessage: 'Registry',
          }
        ),
        os: OS.windows,
        protectionField: 'registry',
      },
      {
        name: i18n.translate(
          'xpack.securitySolution.endpoint.policyDetailsConfig.windows.events.security',
          {
            defaultMessage: 'Security',
          }
        ),
        os: OS.windows,
        protectionField: 'security',
      },
    ];
    return (
      <>
        <ConfigFormHeading>{EVENTS_HEADING}</ConfigFormHeading>
        <EuiSpacer size="s" />
        {items.map((item, index) => {
          return (
            <EventsCheckbox
              name={item.name}
              key={index}
              data-test-subj={`policyWindowsEvent_${item.protectionField}`}
              setter={(config, checked) =>
                setIn(config)(item.os)('events')(item.protectionField)(checked)
              }
              getter={(config) => getIn(config)(item.os)('events')(item.protectionField)}
            />
          );
        })}
      </>
    );
  }, []);

  return (
    <ConfigForm
      type={EVENTS_FORM_TYPE_LABEL}
      supportedOss={['windows']}
      dataTestSubj="windowsEventingForm"
      rightCorner={
        <EuiText size="s" color="subdued">
          {COLLECTIONS_ENABLED_MESSAGE(selected, total)}
        </EuiText>
      }
    >
      {checkboxes}
    </ConfigForm>
  );
});
