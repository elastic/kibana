/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut } from '@elastic/eui';
import React from 'react';
import type { FilterManager } from 'src/plugins/data/public';

import { DataProviders } from '../data_providers';
import { StatefulSearchOrFilter } from '../search_or_filter';

import * as i18n from './translations';
import {
  TimelineStatus,
  TimelineStatusLiteralWithNull,
} from '../../../../../common/types/timeline';

interface Props {
  filterManager: FilterManager;
  show: boolean;
  showCallOutUnauthorizedMsg: boolean;
  status: TimelineStatusLiteralWithNull;
  timelineId: string;
}

const TimelineHeaderComponent: React.FC<Props> = ({
  filterManager,
  show,
  showCallOutUnauthorizedMsg,
  status,
  timelineId,
}) => (
  <>
    {showCallOutUnauthorizedMsg && (
      <EuiCallOut
        data-test-subj="timelineCallOutUnauthorized"
        title={i18n.CALL_OUT_UNAUTHORIZED_MSG}
        color="warning"
        iconType="alert"
        size="s"
      />
    )}
    {status === TimelineStatus.immutable && (
      <EuiCallOut
        data-test-subj="timelineImmutableCallOut"
        title={i18n.CALL_OUT_IMMUTABLE}
        color="primary"
        iconType="alert"
        size="s"
      />
    )}
    {show && <DataProviders timelineId={timelineId} />}

    <StatefulSearchOrFilter filterManager={filterManager} timelineId={timelineId} />
  </>
);

export const TimelineHeader = React.memo(TimelineHeaderComponent);
