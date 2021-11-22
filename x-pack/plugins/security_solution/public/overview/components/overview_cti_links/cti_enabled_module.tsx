/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ThreatIntelLinkPanelProps } from '.';
import { useTiDataSources } from '../../containers/overview_cti_links/use_ti_data_sources';
import { useCtiDashboardLinks } from '../../containers/overview_cti_links';
import { ThreatIntelPanelView } from './threat_intel_panel_view';

// export type CtiEnabledModuleProps = Omit<
//   ThreatIntelLinkPanelProps,
//   'hasSomeThreatIntelData' | 'isSomeIntegrationsInstalled' | 'isSomeIntegrationsDisabled'
// > & {
//   isSomeIntegrationsDisabled: boolean;
// };

export const CtiEnabledModuleComponent: React.FC<ThreatIntelLinkPanelProps> = (props) => {
  const { to, from, isSomeIntegrationsDisabled, allTiDataSources } = props;
  const { tiDataSources, totalCount } = useTiDataSources({ to, from }, allTiDataSources);
  const { listItems } = useCtiDashboardLinks({ to, from, tiDataSources });

  return (
    <ThreatIntelPanelView
      listItems={listItems}
      totalCount={totalCount}
      isSomeIntegrationsDisabled={isSomeIntegrationsDisabled}
    />
  );
};

export const CtiEnabledModule = React.memo(CtiEnabledModuleComponent);
CtiEnabledModule.displayName = 'CtiEnabledModule';
