/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer } from '@elastic/eui';
import { Immutable, OperatingSystem } from '../../../../../../../common/endpoint/types';
import { BehaviorProtectionOSes, OS } from '../../../types';
import { ConfigForm } from '../../components/config_form';
import { RadioButtons } from '../components/radio_buttons';
import { UserNotification } from '../components/user_notification';
import { ProtectionSwitch } from '../components/protection_switch';

/** The Behavior Protections form for policy details
 *  which will configure for all relevant OSes.
 */
export const BehaviorProtection = React.memo(() => {
  const OSes: Immutable<BehaviorProtectionOSes[]> = [OS.windows];
  const protection = 'behavior_protection';
  return (
    <ConfigForm
      type={i18n.translate('xpack.securitySolution.endpoint.policy.details.behavior_protection', {
        defaultMessage: 'Behavior Protection',
      })}
      supportedOss={[OperatingSystem.WINDOWS]}
      dataTestSubj="behaviorProtectionsForm"
      rightCorner={<ProtectionSwitch protection={protection} osList={OSes} />}
    >
      <RadioButtons protection={protection} osList={OSes} />
      <UserNotification protection={protection} osList={OSes} />
      <EuiSpacer size="m" />
    </ConfigForm>
  );
});

BehaviorProtection.displayName = 'BehaviorProtection';
