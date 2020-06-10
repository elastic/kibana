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
import { selectedMacEvents, totalMacEvents } from '../../../store/policy_details/selectors';
import { ConfigForm } from '../config_form';
import { getIn, setIn } from '../../../models/policy_details_config';
import { UIPolicyConfig } from '../../../../../../../common/endpoint/types';

export const MacEvents = React.memo(() => {
  const selected = usePolicyDetailsSelector(selectedMacEvents);
  const total = usePolicyDetailsSelector(totalMacEvents);

  const checkboxes = useMemo(() => {
    const items: Array<{
      name: string;
      os: 'mac';
      protectionField: keyof UIPolicyConfig['mac']['events'];
    }> = [
      {
        name: i18n.translate(
          'xpack.securitySolution.endpoint.policyDetailsConfig.mac.events.file',
          {
            defaultMessage: 'File',
          }
        ),
        os: OS.mac,
        protectionField: 'file',
      },
      {
        name: i18n.translate(
          'xpack.securitySolution.endpoint.policyDetailsConfig.mac.events.process',
          {
            defaultMessage: 'Process',
          }
        ),
        os: OS.mac,
        protectionField: 'process',
      },
      {
        name: i18n.translate(
          'xpack.securitySolution.endpoint.policyDetailsConfig.mac.events.network',
          {
            defaultMessage: 'Network',
          }
        ),
        os: OS.mac,
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
              data-test-subj={`policyMacEvent_${item.protectionField}`}
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
      supportedOss={i18n.translate('xpack.securitySolution.endpoint.policy.details.mac', {
        defaultMessage: 'Mac',
      })}
      dataTestSubj="macEventingForm"
      rightCorner={collectionsEnabled}
    >
      {checkboxes}
    </ConfigForm>
  );
});
