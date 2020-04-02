/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiTitle, EuiText, EuiSpacer } from '@elastic/eui';
import { EventingCheckbox } from './checkbox';
import { OS, EventingFields } from '../../../../types';
import { usePolicyDetailsSelector } from '../../policy_hooks';
import {
  selectedWindowsEventing,
  totalWindowsEventing,
} from '../../../../store/policy_details/selectors';
import { ConfigForm } from '../config_form';

export const WindowsEventing = React.memo(() => {
  const selected = usePolicyDetailsSelector(selectedWindowsEventing);
  const total = usePolicyDetailsSelector(totalWindowsEventing);

  const checkboxes = useMemo(
    () => [
      {
        name: i18n.translate('xpack.endpoint.policyDetailsConfig.eventingProcess', {
          defaultMessage: 'Process',
        }),
        os: OS.windows,
        protectionField: EventingFields.process,
      },
      {
        name: i18n.translate('xpack.endpoint.policyDetailsConfig.eventingNetwork', {
          defaultMessage: 'Network',
        }),
        os: OS.windows,
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
              id={`eventing${item.name}`}
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
        i18n.translate('xpack.endpoint.policy.details.windows', { defaultMessage: 'Windows' }),
      ]}
      id="windowsEventingForm"
      rightCorner={collectionsEnabled()}
      children={renderCheckboxes()}
    />
  );
});
