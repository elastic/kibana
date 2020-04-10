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
import {
  selectedWindowsEvents,
  totalWindowsEvents,
} from '../../../../store/policy_details/selectors';
import { ConfigForm } from '../config_form';
import { setIn, getIn } from '../../../../models/policy_details_config';

export const WindowsEvents = React.memo(() => {
  const selected = usePolicyDetailsSelector(selectedWindowsEvents);
  const total = usePolicyDetailsSelector(totalWindowsEvents);

  const checkboxes: Array<{
    name: string;
    os: 'windows';
    protectionField: keyof UIPolicyConfig['windows']['events'];
  }> = useMemo(
    () => [
      {
        name: i18n.translate('xpack.endpoint.policyDetailsConfig.windows.events.process', {
          defaultMessage: 'Process',
        }),
        os: OS.windows,
        protectionField: 'process',
      },
      {
        name: i18n.translate('xpack.endpoint.policyDetailsConfig.windows.events.network', {
          defaultMessage: 'Network',
        }),
        os: OS.windows,
        protectionField: 'network',
      },
    ],
    []
  );

  const renderCheckboxes = useMemo(() => {
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
  }, [checkboxes]);

  const collectionsEnabled = useMemo(() => {
    return (
      <EuiText size="s" color="subdued">
        <FormattedMessage
          id="xpack.endpoint.policy.details.eventCollectionsEnabled"
          defaultMessage="{selected} / {total} event collections enabled"
          values={{ selected, total }}
        />
      </EuiText>
    );
  }, [selected, total]);

  return (
    <ConfigForm
      type={i18n.translate('xpack.endpoint.policy.details.eventCollection', {
        defaultMessage: 'Event Collection',
      })}
      supportedOss={useMemo(
        () => [
          i18n.translate('xpack.endpoint.policy.details.windows', { defaultMessage: 'Windows' }),
        ],
        []
      )}
      id="windowsEventingForm"
      rightCorner={collectionsEnabled}
      children={renderCheckboxes}
    />
  );
});
