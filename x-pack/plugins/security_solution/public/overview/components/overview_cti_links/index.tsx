/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { GlobalTimeArgs } from '../../../common/containers/use_global_time';
import { CtiEnabledModule } from './cti_enabled_module';
import { CtiDisabledModule } from './cti_disabled_module';

export type ThreatIntelLinkPanelProps = Pick<
  GlobalTimeArgs,
  'from' | 'to' | 'deleteQuery' | 'setQuery'
> & {
  isThreatIntelModuleEnabled: boolean | undefined;
};

const ThreatIntelLinkPanelComponent: React.FC<ThreatIntelLinkPanelProps> = (props) => {
  switch (props.isThreatIntelModuleEnabled) {
    case true:
      return (
        <div data-test-subj="cti-enabled-module">
          <CtiEnabledModule {...props} />
        </div>
      );
    case false:
      return (
        <div data-test-subj="cti-disabled-module">
          <CtiDisabledModule />
        </div>
      );
    case undefined:
    default:
      return null;
  }
};

export const ThreatIntelLinkPanel = React.memo(ThreatIntelLinkPanelComponent);
ThreatIntelLinkPanel.displayName = 'ThreatIntelDashboardLinksComponent';
