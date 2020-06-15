/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiTitle, EuiText, EuiSpacer } from '@elastic/eui';
import { EventsCheckbox } from './checkbox';
import { OS } from '../../../types';
import { usePolicyDetailsSelector } from '../../policy_hooks';
import { selectedWindowsEvents, totalWindowsEvents } from '../../../store/policy_details/selectors';
import { ConfigForm } from '../config_form';
import { setIn, getIn } from '../../../models/policy_details_config';
import { UIPolicyConfig, Immutable } from '../../../../../../../common/endpoint/types';

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
        <EuiTitle size="xxs">
          <h5>
            <FormattedMessage
              id="xpack.securitySolution.endpoint.policyDetailsConfig.eventingEvents"
              defaultMessage="Events"
            />
          </h5>
        </EuiTitle>
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

  const collectionsEnabled = useMemo(() => {
    return (
      <EuiText size="s" color="subdued">
        <FormattedMessage
          id="xpack.securitySolution.endpoint.policy.details.eventCollectionsEnabled"
          defaultMessage="{selected} / {total} event collections enabled"
          values={{ selected, total }}
        />
      </EuiText>
    );
  }, [selected, total]);

  return (
    <ConfigForm
      type={i18n.translate('xpack.securitySolution.endpoint.policy.details.eventCollection', {
        defaultMessage: 'Event Collection',
      })}
      description={i18n.translate('xpack.securitySolution.endpoint.policy.details.windowsLabel', {
        defaultMessage: 'Windows',
      })}
      supportedOss={i18n.translate('xpack.securitySolution.endpoint.policy.details.windows', {
        defaultMessage: 'Windows',
      })}
      dataTestSubj="windowsEventingForm"
      rightCorner={collectionsEnabled}
    >
      {checkboxes}
    </ConfigForm>
  );
});
