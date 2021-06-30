/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ThreatIntelLinkPanelProps } from './index';
import { useCtiEventCounts } from '../../containers/overview_cti_links/use_cti_event_counts';
import { CtiNoEvents } from './cti_no_events';
import { CtiWithEvents } from './cti_with_events';

export const CtiEnabledModuleComponent: React.FC<ThreatIntelLinkPanelProps> = (props) => {
  const { eventCountsByDataset, totalCount } = useCtiEventCounts(props);
  const { to, from } = props;

  switch (totalCount) {
    case -1:
      return null;
    case 0:
      return <CtiNoEvents to={to} from={from} data-test-subj="cti-with-no-events" />;
    default:
      return (
        <CtiWithEvents
          data-test-subj="cti-with-events"
          eventCountsByDataset={eventCountsByDataset}
          totalCount={totalCount}
          to={to}
          from={from}
        />
      );
  }
};

CtiEnabledModuleComponent.displayName = 'CtiEnabledModule';

export const CtiEnabledModule = React.memo(CtiEnabledModuleComponent);
