/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, useMemo } from 'react';
import { FormattedMessage, FormattedDate, FormattedTime } from '@kbn/i18n-react';
import {
  EuiCallOut,
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiLoadingSpinner,
  EuiIcon,
} from '@elastic/eui';

import { useStartServices } from '../../../../hooks';
import type { CurrentUpgrade } from '../../../../types';

export interface CurrentBulkUpgradeCalloutProps {
  currentUpgrade: CurrentUpgrade;
  abortUpgrade: (currentUpgrade: CurrentUpgrade) => Promise<void>;
}

export const CurrentBulkUpgradeCallout: React.FunctionComponent<CurrentBulkUpgradeCalloutProps> = ({
  currentUpgrade,
  abortUpgrade,
}) => {
  const { docLinks } = useStartServices();
  const [isAborting, setIsAborting] = useState(false);
  const onClickAbortUpgrade = useCallback(async () => {
    try {
      setIsAborting(true);
      await abortUpgrade(currentUpgrade);
    } finally {
      setIsAborting(false);
    }
  }, [currentUpgrade, abortUpgrade]);

  const isScheduled = useMemo(() => {
    if (!currentUpgrade.startTime) {
      return false;
    }
    const now = Date.now();
    const startDate = new Date(currentUpgrade.startTime).getTime();

    return startDate > now;
  }, [currentUpgrade]);

  const calloutTitle =
    isScheduled && currentUpgrade.startTime ? (
      <FormattedMessage
        id="xpack.fleet.currentUpgrade.scheduleCalloutTitle"
        defaultMessage="{nbAgents} agents scheduled to upgrade to version {version} on {date}"
        values={{
          nbAgents: currentUpgrade.nbAgents - currentUpgrade.nbAgentsAck,
          version: currentUpgrade.version,
          date: (
            <>
              <FormattedDate
                value={currentUpgrade.startTime}
                year="numeric"
                month="short"
                day="2-digit"
              />
              &nbsp;
              <FormattedTime value={currentUpgrade.startTime} />
            </>
          ),
        }}
      />
    ) : (
      <FormattedMessage
        id="xpack.fleet.currentUpgrade.calloutTitle"
        defaultMessage="Upgrading {nbAgents, plural, one {# agent} other {# agents}} to version {version}"
        values={{
          nbAgents: currentUpgrade.nbAgents - currentUpgrade.nbAgentsAck,
          version: currentUpgrade.version,
        }}
      />
    );
  return (
    <EuiCallOut color="primary">
      <EuiFlexGroup
        className="euiCallOutHeader__title"
        justifyContent="spaceBetween"
        alignItems="center"
        gutterSize="none"
      >
        <EuiFlexItem grow={false}>
          <div>
            {isScheduled ? <EuiIcon type="iInCircle" /> : <EuiLoadingSpinner />}
            &nbsp;&nbsp;
            {calloutTitle}
          </div>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            onClick={onClickAbortUpgrade}
            isLoading={isAborting}
            data-test-subj="abortUpgradeBtn"
          >
            <FormattedMessage
              id="xpack.fleet.currentUpgrade.abortUpgradeButtom"
              defaultMessage="Abort upgrade"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <FormattedMessage
        id="xpack.fleet.currentUpgrade.calloutDescription"
        defaultMessage="For more information see the {guideLink}."
        values={{
          guideLink: (
            <EuiLink href={docLinks.links.fleet.fleetServerAddFleetServer} target="_blank" external>
              <FormattedMessage
                id="xpack.fleet.currentUpgrade.guideLink"
                defaultMessage="Fleet and Elastic Agent Guide"
              />
            </EuiLink>
          ),
        }}
      />
    </EuiCallOut>
  );
};
