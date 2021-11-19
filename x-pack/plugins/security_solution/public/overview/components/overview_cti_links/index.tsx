/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { GlobalTimeArgs } from '../../../common/containers/use_global_time';
import { Integration } from '../../containers/overview_cti_links/use_ti_integrations';
import { CtiEnabledModule } from './cti_enabled_module';
import { CtiDisabledModule } from './cti_disabled_module';

export type ThreatIntelLinkPanelProps = Pick<
  GlobalTimeArgs,
  'from' | 'to' | 'deleteQuery' | 'setQuery'
> & {
  hasSomeThreatIntelData: boolean | undefined;
  isSomeIntegrationsInstalled: boolean | undefined;
  isSomeIntegrationsDisabled: boolean | undefined;
  integrations: Integration[];
};

const ThreatIntelLinkPanelComponent: React.FC<ThreatIntelLinkPanelProps> = (props) => {
  const { hasSomeThreatIntelData, isSomeIntegrationsInstalled, isSomeIntegrationsDisabled } = props;
  if (hasSomeThreatIntelData === undefined) {
    return null;
  }

  const isThreatIntelModuleEnabled = hasSomeThreatIntelData || isSomeIntegrationsInstalled;
  return isThreatIntelModuleEnabled ? (
    <div data-test-subj="cti-enabled-module">
      <CtiEnabledModule
        {...props}
        isSomeIntegrationsDisabled={Boolean(isSomeIntegrationsDisabled)}
      />
    </div>
  ) : (
    <div data-test-subj="cti-disabled-module">
      <CtiDisabledModule />
    </div>
  );
};

export const ThreatIntelLinkPanel = React.memo(ThreatIntelLinkPanelComponent);
ThreatIntelLinkPanel.displayName = 'ThreatIntelDashboardLinksComponent';
