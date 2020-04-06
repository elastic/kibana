/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { htmlIdGenerator } from '@elastic/eui';
import { EuiTitle, EuiText, EuiSpacer } from '@elastic/eui';
import { EventingCheckbox } from './checkbox';
import { OS, EventingFields } from '../../../../types';
import { usePolicyDetailsSelector } from '../../policy_hooks';
import { selectedMacEventing, totalMacEventing } from '../../../../store/policy_details/selectors';
import { ConfigForm } from '../config_form';

export const MacEventing = React.memo(() => {
  const selected = usePolicyDetailsSelector(selectedMacEventing);
  const total = usePolicyDetailsSelector(totalMacEventing);

  const checkboxes = useMemo(
    () => [
      {
        name: i18n.translate('xpack.endpoint.policyDetailsConfig.mac.events.file', {
          defaultMessage: 'File',
        }),
        os: OS.mac,
        protectionField: EventingFields.file,
      },
      {
        name: i18n.translate('xpack.endpoint.policyDetailsConfig.mac.events.process', {
          defaultMessage: 'Process',
        }),
        os: OS.mac,
        protectionField: EventingFields.process,
      },
      {
        name: i18n.translate('xpack.endpoint.policyDetailsConfig.mac.events.network', {
          defaultMessage: 'Network',
        }),
        os: OS.mac,
        protectionField: EventingFields.network,
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
            <EventingCheckbox
              id={useMemo(() => htmlIdGenerator()(), [])}
              name={item.name}
              key={index}
              os={item.os}
              protectionField={item.protectionField}
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
        i18n.translate('xpack.endpoint.policy.details.mac', { defaultMessage: 'Mac' }),
      ]}
      id="macEventingForm"
      rightCorner={collectionsEnabled()}
      children={renderCheckboxes()}
    />
  );
});
