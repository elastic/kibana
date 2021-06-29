/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { GlobalTimeArgs } from '../../../common/containers/use_global_time';
import { useIsThreatIntelModuleEnabled } from '../../containers/overview_cti_links/use_is_threat_intel_module_enabled';
import { CtiEnabledModule } from './cti_enabled_module';
import { CtiDisabledModule } from './cti_disabled_module';

export type ThreatIntelLinkPanelProps = Pick<
  GlobalTimeArgs,
  'from' | 'to' | 'deleteQuery' | 'setQuery'
>;

const ThreatIntelLinkPanelComponent: React.FC<ThreatIntelLinkPanelProps> = (props) => {
  const isThreatIntelModuleEnabled = useIsThreatIntelModuleEnabled();

  switch (isThreatIntelModuleEnabled) {
    case true:
      return <CtiEnabledModule {...props} data-test-subj="cti-enabled-module" />;
    case false:
      return <CtiDisabledModule data-test-subj="cti-disabled-module" />;
    case undefined:
    default:
      return null;
  }
};

ThreatIntelLinkPanelComponent.displayName = 'ThreatIntelDashboardLinksComponent';

export const ThreatIntelLinkPanel = React.memo(ThreatIntelLinkPanelComponent);
