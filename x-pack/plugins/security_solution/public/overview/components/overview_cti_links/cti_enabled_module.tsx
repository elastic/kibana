/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ThreatIntelLinkPanelProps } from '.';
import { useThreatIntelSource } from '../../containers/overview_cti_links/use_threat_intel_source';
import { CtiNoEvents } from './cti_no_events';
import { CtiWithEvents } from './cti_with_events';

export type CtiEnabledModuleProps = Omit<
  ThreatIntelLinkPanelProps,
  'hasSomeThreatIntelData' | 'isSomeIntegrationsInstalled' | 'isSomeIntegrationsDisabled'
> & {
  isSomeIntegrationsDisabled: boolean;
};

export const CtiEnabledModuleComponent: React.FC<CtiEnabledModuleProps> = (props) => {
  const { to, from, isSomeIntegrationsDisabled, allIntegrations } = props;
  const { integrations, totalCount } = useThreatIntelSource({ to, from }, allIntegrations);

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
            integrations={integrations}
          />
        </div>
      );
    default:
      return (
        <div data-test-subj="cti-with-events">
          <CtiWithEvents
            totalCount={totalCount}
            to={to}
            from={from}
            isSomeIntegrationsDisabled={isSomeIntegrationsDisabled}
            integrations={integrations}
          />
        </div>
      );
  }
};

export const CtiEnabledModule = React.memo(CtiEnabledModuleComponent);
CtiEnabledModule.displayName = 'CtiEnabledModule';
