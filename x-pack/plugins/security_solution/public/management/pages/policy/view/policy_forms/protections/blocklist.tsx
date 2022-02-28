/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  Immutable,
  OperatingSystem,
  PolicyOperatingSystem,
} from '../../../../../../../common/endpoint/types';
import { BlocklistProtectionOSes } from '../../../types';
import { ConfigForm } from '../../components/config_form';
import { RadioButtons } from '../components/radio_buttons';
import { UserNotification } from '../components/user_notification';
import { ProtectionSwitch } from '../components/protection_switch';
import { useLicense } from '../../../../../../common/hooks/use_license';

/** The Behavior Protections form for policy details
 *  which will configure for all relevant OSes.
 */
export const BlocklistProtection = React.memo(() => {
  const OSes: Immutable<BlocklistProtectionOSes[]> = [
    PolicyOperatingSystem.windows,
    PolicyOperatingSystem.mac,
    PolicyOperatingSystem.linux,
  ];
  const protection = 'blocklist';
  const protectionLabel = i18n.translate(
    'xpack.securitySolution.endpoint.policy.protections.blocklist',
    {
      defaultMessage: 'Blocklist',
    }
  );
  const isPlatinumPlus = useLicense().isPlatinumPlus();

  return (
    <ConfigForm
      type={i18n.translate('xpack.securitySolution.endpoint.policy.details.blocklist', {
        defaultMessage: 'Blocklist',
      })}
      supportedOss={[OperatingSystem.WINDOWS, OperatingSystem.MAC, OperatingSystem.LINUX]}
      dataTestSubj="blocklistForm"
      rightCorner={
        <ProtectionSwitch protection={protection} protectionLabel={protectionLabel} osList={OSes} />
      }
    >
      <RadioButtons protection={protection} osList={OSes} />
      {isPlatinumPlus && <UserNotification protection={protection} osList={OSes} />}
    </ConfigForm>
  );
});

BlocklistProtection.displayName = 'BlocklistProtection';
