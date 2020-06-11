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
import { selectedLinuxEvents, totalLinuxEvents } from '../../../store/policy_details/selectors';
import { ConfigForm } from '../config_form';
import { getIn, setIn } from '../../../models/policy_details_config';
import { UIPolicyConfig } from '../../../../../../../common/endpoint/types';

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
      description={i18n.translate(
        'xpack.securitySolution.endpoint.policy.details.eventCollectionLabel',
        {
          defaultMessage: 'Event Collection',
        }
      )}
      supportedOss={i18n.translate('xpack.securitySolution.endpoint.policy.details.linux', {
        defaultMessage: 'Linux',
      })}
      dataTestSubj="linuxEventingForm"
      rightCorner={collectionsEnabled}
    >
      {checkboxes}
    </ConfigForm>
  );
});
