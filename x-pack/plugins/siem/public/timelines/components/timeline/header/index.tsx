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
import {
  OnDataProviderEdited,
  OnDataProviderRemoved,
  OnToggleDataProviderEnabled,
  OnToggleDataProviderExcluded,
  OnToggleDataProviderType,
} from '../events';
import { StatefulSearchOrFilter } from '../search_or_filter';
import { BrowserFields } from '../../../../common/containers/source';
import { TimelineType } from '../../../../../common/types/timeline';

import * as i18n from './translations';

interface Props {
  browserFields: BrowserFields;
  dataProviders: DataProvider[];
  filterManager: FilterManager;
  indexPattern: IIndexPattern;
  onDataProviderEdited: OnDataProviderEdited;
  onDataProviderRemoved: OnDataProviderRemoved;
  onToggleDataProviderEnabled: OnToggleDataProviderEnabled;
  onToggleDataProviderExcluded: OnToggleDataProviderExcluded;
  onToggleDataProviderType: OnToggleDataProviderType;
  show: boolean;
  showCallOutUnauthorizedMsg: boolean;
  timelineId: string;
  timelineType: TimelineType;
}

const TimelineHeaderComponent: React.FC<Props> = ({
  browserFields,
  indexPattern,
  dataProviders,
  filterManager,
  onDataProviderEdited,
  onDataProviderRemoved,
  onToggleDataProviderEnabled,
  onToggleDataProviderExcluded,
  onToggleDataProviderType,
  show,
  showCallOutUnauthorizedMsg,
  timelineId,
  timelineType,
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
    {show && (
      <>
        <DataProviders
          browserFields={browserFields}
          timelineId={timelineId}
          timelineType={timelineType}
          dataProviders={dataProviders}
          onDataProviderEdited={onDataProviderEdited}
          onDataProviderRemoved={onDataProviderRemoved}
          onToggleDataProviderEnabled={onToggleDataProviderEnabled}
          onToggleDataProviderExcluded={onToggleDataProviderExcluded}
          onToggleDataProviderType={onToggleDataProviderType}
        />
      </>
    )}

    <StatefulSearchOrFilter
      browserFields={browserFields}
      filterManager={filterManager}
      indexPattern={indexPattern}
      timelineId={timelineId}
    />
  </>
);

export const TimelineHeader = React.memo(
  TimelineHeaderComponent,
  (prevProps, nextProps) =>
    deepEqual(prevProps.browserFields, nextProps.browserFields) &&
    deepEqual(prevProps.indexPattern, nextProps.indexPattern) &&
    deepEqual(prevProps.dataProviders, nextProps.dataProviders) &&
    prevProps.filterManager === nextProps.filterManager &&
    prevProps.onDataProviderEdited === nextProps.onDataProviderEdited &&
    prevProps.onDataProviderRemoved === nextProps.onDataProviderRemoved &&
    prevProps.onToggleDataProviderEnabled === nextProps.onToggleDataProviderEnabled &&
    prevProps.onToggleDataProviderExcluded === nextProps.onToggleDataProviderExcluded &&
    prevProps.onToggleDataProviderType === nextProps.onToggleDataProviderType &&
    prevProps.show === nextProps.show &&
    prevProps.showCallOutUnauthorizedMsg === nextProps.showCallOutUnauthorizedMsg &&
    prevProps.timelineId === nextProps.timelineId &&
    prevProps.timelineType === nextProps.timelineType
);
