/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCallOut } from '@elastic/eui';
import React from 'react';
import { FilterManager, IIndexPattern } from 'src/plugins/data/public';
import deepEqual from 'fast-deep-equal';

import { DataProviders } from '../data_providers';
import { DataProvider } from '../data_providers/data_provider';
import { StatefulSearchOrFilter } from '../search_or_filter';
import { BrowserFields } from '../../../../common/containers/source';

import * as i18n from './translations';
import {
  TimelineStatus,
  TimelineStatusLiteralWithNull,
} from '../../../../../common/types/timeline';

interface Props {
  browserFields: BrowserFields;
  dataProviders: DataProvider[];
  filterManager: FilterManager;
  graphEventId?: string;
  indexPattern: IIndexPattern;
  show: boolean;
  showCallOutUnauthorizedMsg: boolean;
  status: TimelineStatusLiteralWithNull;
  timelineId: string;
}

const TimelineHeaderComponent: React.FC<Props> = ({
  browserFields,
  indexPattern,
  dataProviders,
  filterManager,
  graphEventId,
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
    {show && !graphEventId && (
      <>
        <DataProviders
          browserFields={browserFields}
          timelineId={timelineId}
          dataProviders={dataProviders}
        />

        <StatefulSearchOrFilter
          browserFields={browserFields}
          filterManager={filterManager}
          indexPattern={indexPattern}
          timelineId={timelineId}
        />
      </>
    )}
  </>
);

export const TimelineHeader = React.memo(
  TimelineHeaderComponent,
  (prevProps, nextProps) =>
    deepEqual(prevProps.browserFields, nextProps.browserFields) &&
    deepEqual(prevProps.indexPattern, nextProps.indexPattern) &&
    deepEqual(prevProps.dataProviders, nextProps.dataProviders) &&
    prevProps.filterManager === nextProps.filterManager &&
    prevProps.graphEventId === nextProps.graphEventId &&
    prevProps.show === nextProps.show &&
    prevProps.showCallOutUnauthorizedMsg === nextProps.showCallOutUnauthorizedMsg &&
    prevProps.status === nextProps.status &&
    prevProps.timelineId === nextProps.timelineId
);
