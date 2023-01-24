/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiCallOut,
  EuiLink,
  EuiFlyout,
  EuiCodeBlock,
  EuiPortal,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';
import styled from 'styled-components';

import type { UpgradePackagePolicyDryRunResponse } from '../../../../../../../common/types/rest_spec';

const FlyoutBody = styled(EuiFlyoutBody)`
  .euiFlyoutBody__overflowContent {
    padding: 0;
  }
`;

export const UpgradeStatusCallout: React.FunctionComponent<{
  dryRunData: UpgradePackagePolicyDryRunResponse;
}> = ({ dryRunData }) => {
  const [isPreviousVersionFlyoutOpen, setIsPreviousVersionFlyoutOpen] = useState<boolean>(false);

  if (!dryRunData) {
    return null;
  }

  const isReadyForUpgrade = !dryRunData[0].hasErrors;

  const [currentPackagePolicy, proposedUpgradePackagePolicy] = dryRunData[0].diff || [];

  return (
    <>
      {isPreviousVersionFlyoutOpen && currentPackagePolicy && (
        <EuiPortal>
          <EuiFlyout onClose={() => setIsPreviousVersionFlyoutOpen(false)} size="l" maxWidth={640}>
            <EuiFlyoutHeader hasBorder>
              <EuiTitle size="m">
                <h2 id="FleetPackagePolicyPreviousVersionFlyoutTitle">
                  <FormattedMessage
                    id="xpack.fleet.upgradePackagePolicy.previousVersionFlyout.title"
                    defaultMessage="'{name}' integration policy"
                    values={{ name: currentPackagePolicy?.name }}
                  />
                </h2>
              </EuiTitle>
            </EuiFlyoutHeader>
            <FlyoutBody>
              <EuiCodeBlock isCopyable fontSize="m" whiteSpace="pre">
                {JSON.stringify(dryRunData[0].agent_diff?.[0] || [], null, 2)}
              </EuiCodeBlock>
            </FlyoutBody>
          </EuiFlyout>
        </EuiPortal>
      )}

      {isReadyForUpgrade && currentPackagePolicy ? (
        <EuiCallOut
          title={i18n.translate('xpack.fleet.upgradePackagePolicy.statusCallOut.successTitle', {
            defaultMessage: 'Ready to upgrade',
          })}
          color="success"
          iconType="checkInCircleFilled"
        >
          <FormattedMessage
            id="xpack.fleet.upgradePackagePolicy.statusCallout.successContent"
            defaultMessage="This integration is ready to be upgraded from version {currentVersion} to {upgradeVersion}. Review the changes below and save to upgrade."
            values={{
              currentVersion: currentPackagePolicy?.package?.version,
              upgradeVersion: proposedUpgradePackagePolicy?.package?.version,
            }}
          />
        </EuiCallOut>
      ) : (
        <EuiCallOut
          title={i18n.translate('xpack.fleet.upgradePackagePolicy.statusCallOut.errorTitle', {
            defaultMessage: 'Review field conflicts',
          })}
          color="warning"
          iconType="alert"
        >
          <FormattedMessage
            id="xpack.fleet.upgradePackagePolicy.statusCallout.errorContent"
            defaultMessage="This integration has conflicting fields from version {currentVersion} to {upgradeVersion} Review the configuration and save to perform the upgrade. You may reference your {previousConfigurationLink} for comparison."
            values={{
              currentVersion: currentPackagePolicy?.package?.version,
              upgradeVersion: proposedUpgradePackagePolicy?.package?.version,
              previousConfigurationLink: (
                <EuiLink onClick={() => setIsPreviousVersionFlyoutOpen(true)}>
                  <FormattedMessage
                    id="xpack.fleet.upgradePackagePolicy.statusCallout.previousConfigurationLink"
                    defaultMessage="previous configuration"
                  />
                </EuiLink>
              ),
            }}
          />
        </EuiCallOut>
      )}
    </>
  );
};
