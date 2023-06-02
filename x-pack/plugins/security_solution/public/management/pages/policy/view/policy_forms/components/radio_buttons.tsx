/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSpacer, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import type {
  Immutable,
  ImmutableArray,
  UIPolicyConfig,
} from '../../../../../../../common/endpoint/types';
import { ProtectionModes } from '../../../../../../../common/endpoint/types';
import type { PolicyProtection } from '../../../types';
import { ConfigFormHeading } from '../../components/config_form';
import { ProtectionRadio } from './protection_radio';

export const RadioButtons = React.memo(
  ({
    protection,
    osList,
  }: {
    protection: PolicyProtection;
    osList: ImmutableArray<Partial<keyof UIPolicyConfig>>;
  }) => {
    const radios: Immutable<
      Array<{
        id: ProtectionModes;
        label: string;
      }>
    > = useMemo(() => {
      return [
        {
          id: ProtectionModes.detect,
          label: i18n.translate('xpack.securitySolution.endpoint.policy.details.detect', {
            defaultMessage: 'Detect',
          }),
        },
        {
          id: ProtectionModes.prevent,
          label: i18n.translate('xpack.securitySolution.endpoint.policy.details.prevent', {
            defaultMessage: 'Prevent',
          }),
        },
      ];
    }, []);

    return (
      <>
        <ConfigFormHeading>
          <FormattedMessage
            id="xpack.securitySolution.endpoint.policyDetailsConfig.protectionLevel"
            defaultMessage="Protection level"
          />
        </ConfigFormHeading>
        <EuiSpacer size="xs" />
        <EuiFlexGroup>
          <EuiFlexItem grow={1}>
            <ProtectionRadio
              protection={protection}
              protectionMode={radios[0].id}
              osList={osList}
              key={{ protection } + radios[0].id}
              label={radios[0].label}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={5}>
            <ProtectionRadio
              protection={protection}
              protectionMode={radios[1].id}
              osList={osList}
              key={{ protection } + radios[1].id}
              label={radios[1].label}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  }
);

RadioButtons.displayName = 'RadioButtons';
