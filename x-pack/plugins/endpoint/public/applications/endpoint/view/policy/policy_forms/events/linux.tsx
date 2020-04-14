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
import { OS, UIPolicyConfig } from '../../../../types';
import { usePolicyDetailsSelector } from '../../policy_hooks';
import { selectedLinuxEvents, totalLinuxEvents } from '../../../../store/policy_details/selectors';
import { ConfigForm } from '../config_form';
import { getIn, setIn } from '../../../../models/policy_details_config';

export const LinuxEvents = React.memo(() => {
  const selected = usePolicyDetailsSelector(selectedLinuxEvents);
  const total = usePolicyDetailsSelector(totalLinuxEvents);

  const checkboxes: Array<{
    name: string;
    os: 'linux';
    protectionField: keyof UIPolicyConfig['linux']['events'];
  }> = useMemo(
    () => [
      {
        name: i18n.translate('xpack.endpoint.policyDetailsConfig.linux.events.file', {
          defaultMessage: 'File',
        }),
        os: OS.linux,
        protectionField: 'file',
      },
      {
        name: i18n.translate('xpack.endpoint.policyDetailsConfig.linux.events.process', {
          defaultMessage: 'Process',
        }),
        os: OS.linux,
        protectionField: 'process',
      },
      {
        name: i18n.translate('xpack.endpoint.policyDetailsConfig.linux.events.network', {
          defaultMessage: 'Network',
        }),
        os: OS.linux,
        protectionField: 'network',
      },
    ],
    []
  );

  const renderCheckboxes = () => {
    return (
      <>
        <EuiTitle size="xxs">
          <h5>
            <FormattedMessage
              id="xpack.endpoint.policyDetailsConfig.eventingEvents"
              defaultMessage="Events"
            />
          </h5>
        </EuiTitle>
        <EuiSpacer size="s" />
        {checkboxes.map((item, index) => {
          return (
            <EventsCheckbox
              name={item.name}
              key={index}
              setter={(config, checked) =>
                setIn(config)(item.os)('events')(item.protectionField)(checked)
              }
              getter={config => getIn(config)(item.os)('events')(item.protectionField)}
            />
          );
        })}
      </>
    );
  };

  const collectionsEnabled = () => {
    return (
      <EuiText size="s" color="subdued">
        <FormattedMessage
          id="xpack.endpoint.policy.details.eventCollectionsEnabled"
          defaultMessage="{selected} / {total} event collections enabled"
          values={{ selected, total }}
        />
      </EuiText>
    );
  };

  return (
    <ConfigForm
      type={i18n.translate('xpack.endpoint.policy.details.eventCollection', {
        defaultMessage: 'Event Collection',
      })}
      supportedOss={[
        i18n.translate('xpack.endpoint.policy.details.linux', { defaultMessage: 'Linux' }),
      ]}
      id="linuxEventingForm"
      rightCorner={collectionsEnabled()}
      children={renderCheckboxes()}
    />
  );
});
