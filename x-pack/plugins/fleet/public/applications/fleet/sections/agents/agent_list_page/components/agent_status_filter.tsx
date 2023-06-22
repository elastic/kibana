/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFilterButton,
  EuiFilterSelectItem,
  EuiNotificationBadge,
  EuiPopover,
  EuiText,
  EuiTourStep,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo, useState } from 'react';
import styled from 'styled-components';

import { useInactiveAgentsCalloutHasBeenDismissed, useLastSeenInactiveAgentsCount } from '../hooks';

const statusFilters = [
  {
    status: 'healthy',
    label: i18n.translate('xpack.fleet.agentList.statusHealthyFilterText', {
      defaultMessage: 'Healthy',
    }),
  },
  {
    status: 'unhealthy',
    label: i18n.translate('xpack.fleet.agentList.statusUnhealthyFilterText', {
      defaultMessage: 'Unhealthy',
    }),
  },
  {
    status: 'updating',
    label: i18n.translate('xpack.fleet.agentList.statusUpdatingFilterText', {
      defaultMessage: 'Updating',
    }),
  },
  {
    status: 'offline',
    label: i18n.translate('xpack.fleet.agentList.statusOfflineFilterText', {
      defaultMessage: 'Offline',
    }),
  },
  {
    status: 'inactive',
    label: i18n.translate('xpack.fleet.agentList.statusInactiveFilterText', {
      defaultMessage: 'Inactive',
    }),
  },
  {
    status: 'unenrolled',
    label: i18n.translate('xpack.fleet.agentList.statusUnenrolledFilterText', {
      defaultMessage: 'Unenrolled',
    }),
  },
];

const LeftpaddedNotificationBadge = styled(EuiNotificationBadge)`
  margin-left: 10px;
`;

const TourStepNoHeaderFooter = styled(EuiTourStep)`
  .euiTourFooter {
    display: none;
  }
  .euiTourHeader {
    display: none;
  }
`;

const InactiveAgentsTourStep: React.FC<{ isOpen: boolean }> = ({ children, isOpen }) => (
  <TourStepNoHeaderFooter
    content={
      <EuiText size="s">
        <FormattedMessage
          id="xpack.fleet.agentList.inactiveAgentsTourStepContent"
          defaultMessage="Some agents have become inactive and have been hidden. Use status filters to show inactive or unenrolled agents."
        />
      </EuiText>
    }
    isStepOpen={isOpen}
    minWidth={300}
    step={1}
    stepsTotal={0}
    title=""
    onFinish={() => {}}
    anchorPosition="upCenter"
    maxWidth={280}
  >
    {children as React.ReactElement}
  </TourStepNoHeaderFooter>
);

export const AgentStatusFilter: React.FC<{
  selectedStatus: string[];
  onSelectedStatusChange: (status: string[]) => void;
  disabled?: boolean;
  totalInactiveAgents: number;
  isOpenByDefault?: boolean;
}> = (props) => {
  const {
    selectedStatus,
    onSelectedStatusChange,
    disabled,
    totalInactiveAgents,
    isOpenByDefault = false,
  } = props;
  const [lastSeenInactiveAgentsCount, setLastSeenInactiveAgentsCount] =
    useLastSeenInactiveAgentsCount();
  const [inactiveAgentsCalloutHasBeenDismissed, setInactiveAgentsCalloutHasBeenDismissed] =
    useInactiveAgentsCalloutHasBeenDismissed();

  const newlyInactiveAgentsCount = useMemo(() => {
    const newVal = totalInactiveAgents - lastSeenInactiveAgentsCount;

    if (newVal < 0) {
      return 0;
    }

    return newVal;
  }, [lastSeenInactiveAgentsCount, totalInactiveAgents]);

  useMemo(() => {
    if (selectedStatus.length && selectedStatus.includes('inactive') && newlyInactiveAgentsCount) {
      setLastSeenInactiveAgentsCount(totalInactiveAgents);
    }
  }, [
    selectedStatus,
    newlyInactiveAgentsCount,
    setLastSeenInactiveAgentsCount,
    totalInactiveAgents,
  ]);

  useMemo(() => {
    // reduce the number of last seen inactive agents count to the total inactive agents count
    // e.g if agents have become healthy again
    if (totalInactiveAgents > 0 && lastSeenInactiveAgentsCount > totalInactiveAgents) {
      setLastSeenInactiveAgentsCount(totalInactiveAgents);
    }
  }, [lastSeenInactiveAgentsCount, totalInactiveAgents, setLastSeenInactiveAgentsCount]);

  // Status for filtering
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState<boolean>(isOpenByDefault);

  const updateIsStatusFilterOpen = (isOpen: boolean) => {
    if (isOpen && newlyInactiveAgentsCount > 0 && !inactiveAgentsCalloutHasBeenDismissed) {
      setInactiveAgentsCalloutHasBeenDismissed(true);
    }

    setIsStatusFilterOpen(isOpen);
  };
  return (
    <InactiveAgentsTourStep
      isOpen={newlyInactiveAgentsCount > 0 && !inactiveAgentsCalloutHasBeenDismissed}
    >
      <EuiPopover
        ownFocus
        button={
          <EuiFilterButton
            iconType="arrowDown"
            onClick={() => updateIsStatusFilterOpen(!isStatusFilterOpen)}
            isSelected={isStatusFilterOpen}
            hasActiveFilters={selectedStatus.length > 0}
            numActiveFilters={selectedStatus.length}
            numFilters={statusFilters.length}
            disabled={disabled}
            data-test-subj="agentList.statusFilter"
          >
            <FormattedMessage id="xpack.fleet.agentList.statusFilterText" defaultMessage="Status" />
          </EuiFilterButton>
        }
        isOpen={isStatusFilterOpen}
        closePopover={() => updateIsStatusFilterOpen(false)}
        panelPaddingSize="none"
      >
        <div className="euiFilterSelect__items">
          {statusFilters.map(({ label, status }, idx) => (
            <EuiFilterSelectItem
              key={idx}
              checked={selectedStatus.includes(status) ? 'on' : undefined}
              onClick={() => {
                if (selectedStatus.includes(status)) {
                  onSelectedStatusChange([...selectedStatus.filter((s) => s !== status)]);
                } else {
                  onSelectedStatusChange([...selectedStatus, status]);
                }
              }}
            >
              <span>
                {label}
                {status === 'inactive' && newlyInactiveAgentsCount > 0 && (
                  <LeftpaddedNotificationBadge>
                    {newlyInactiveAgentsCount}
                  </LeftpaddedNotificationBadge>
                )}
              </span>
            </EuiFilterSelectItem>
          ))}
        </div>
      </EuiPopover>
    </InactiveAgentsTourStep>
  );
};
