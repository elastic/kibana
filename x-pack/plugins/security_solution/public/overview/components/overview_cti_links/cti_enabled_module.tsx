/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ThreatIntelLinkPanelProps } from '.';
import { useCtiEventCounts } from '../../containers/overview_cti_links/use_cti_event_counts';
import { CtiNoEvents } from './cti_no_events';
import { CtiWithEvents } from './cti_with_events';

export type CtiEnabledModuleProps = Omit<
  ThreatIntelLinkPanelProps,
  'hasSomeThreatIntelData' | 'isSomeIntegrationsInstalled' | 'isSomeIntegrationsDisabled'
> & {
  isSomeIntegrationsDisabled: boolean;
};

export const CtiEnabledModuleComponent: React.FC<CtiEnabledModuleProps> = (props) => {
  const { eventCountsByDataset, totalCount } = useCtiEventCounts(props);
  const { to, from, isSomeIntegrationsDisabled, installedIntegrationIds } = props;

  switch (totalCount) {
    case -1:
      return null;
    case 0:
      return (
        <div data-test-subj="cti-with-no-events">
          <CtiNoEvents
            to={to}
            from={from}
            isSomeIntegrationsDisabled={isSomeIntegrationsDisabled}
            installedIntegrationIds={installedIntegrationIds}
          />
        </div>
      );
    default:
      return (
        <div data-test-subj="cti-with-events">
          <CtiWithEvents
            eventCountsByDataset={eventCountsByDataset}
            totalCount={totalCount}
            to={to}
            from={from}
            isSomeIntegrationsDisabled={isSomeIntegrationsDisabled}
            installedIntegrationIds={installedIntegrationIds}
          />
        </div>
      );
  }
};

export const CtiEnabledModule = React.memo(CtiEnabledModuleComponent);
CtiEnabledModule.displayName = 'CtiEnabledModule';
