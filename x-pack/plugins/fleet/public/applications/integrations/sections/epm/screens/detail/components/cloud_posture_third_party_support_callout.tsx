/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { PackageInfo } from '../../../../../../../../common';

const LS_CLOUD_POSTURE_3P_SUPPORT_WIZ_INTEGRATIONS_CALLOUT_KEY =
  'fleet:cloudSecurityPosture:thirdPartySupport:wizIntegrationsCallout';

export const CloudPostureThirdPartySupportCallout = ({
  packageInfo,
}: {
  packageInfo: PackageInfo;
}) => {
  const [userHasDismissedWizCallout, setUserHasDismissedWizCallout] = useLocalStorage(
    LS_CLOUD_POSTURE_3P_SUPPORT_WIZ_INTEGRATIONS_CALLOUT_KEY
  );

  if (packageInfo.name !== 'wiz' || userHasDismissedWizCallout) return null;

  return (
    <>
      <EuiCallOut
        onDismiss={() => setUserHasDismissedWizCallout(true)}
        iconType="cheer"
        title={i18n.translate('xpack.fleet.epm.wizIntegration.newFeaturesCallout', {
          defaultMessage:
            'New! Starting from version 2.0, ingest vulnerability and misconfiguration findings from Wiz into Elastic. Leverage out-of-the-box contextual investigation and threat-hunting workflows.',
        })}
      />
      <EuiSpacer size="s" />
    </>
  );
};
