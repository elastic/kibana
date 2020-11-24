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
import { selectedLinuxEvents, totalLinuxEvents } from '../../../store/policy_details/selectors';
import { ConfigForm, ConfigFormHeading } from '../../components/config_form';
import { getIn, setIn } from '../../../models/policy_details_config';
import { UIPolicyConfig } from '../../../../../../../common/endpoint/types';
import {
  COLLECTIONS_ENABLED_MESSAGE,
  EVENTS_FORM_TYPE_LABEL,
  EVENTS_HEADING,
} from './translations';

export const LinuxEvents = React.memo(() => {
  const selected = usePolicyDetailsSelector(selectedLinuxEvents);
  const total = usePolicyDetailsSelector(totalLinuxEvents);

  const checkboxes = useMemo(() => {
    const items: Array<{
      name: string;
      os: 'linux';
      protectionField: keyof UIPolicyConfig['linux']['events'];
    }> = [
      {
        name: i18n.translate(
          'xpack.securitySolution.endpoint.policyDetailsConfig.linux.events.file',
          {
            defaultMessage: 'File',
          }
        ),
        os: OS.linux,
        protectionField: 'file',
      },
      {
        name: i18n.translate(
          'xpack.securitySolution.endpoint.policyDetailsConfig.linux.events.process',
          {
            defaultMessage: 'Process',
          }
        ),
        os: OS.linux,
        protectionField: 'process',
      },
      {
        name: i18n.translate(
          'xpack.securitySolution.endpoint.policyDetailsConfig.linux.events.network',
          {
            defaultMessage: 'Network',
          }
        ),
        os: OS.linux,
        protectionField: 'network',
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
              data-test-subj={`policyLinuxEvent_${item.protectionField}`}
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
      supportedOss={['linux']}
      dataTestSubj="linuxEventingForm"
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
