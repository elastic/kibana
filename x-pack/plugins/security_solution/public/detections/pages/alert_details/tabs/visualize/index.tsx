/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiSpacer, EuiFlexGroup, EuiButtonGroup, EuiTitle } from '@elastic/eui';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { TimelineId } from '@kbn/timelines-plugin/common';
import type { SearchHit } from '../../../../../../common/search_strategy';
import { useTimelineDataFilters } from '../../../../../timelines/containers/use_timeline_data_filters';
import { Resolver } from '../../../../../resolver/view';
import { useSourcererDataView } from '../../../../../common/containers/sourcerer';
import { JsonView } from '../../../../../common/components/event_details/json_view';
import { EventFieldsBrowser } from '../../../../../common/components/event_details/event_fields_browser';
import { SourcererScopeName } from '../../../../../common/store/sourcerer/model';
import { AlertDetailsVisualizeGraph } from './graph';

export const AlertDetailsVisualizeTab = React.memo(
  ({
    data,
    searchHit,
    id,
  }: {
    data: TimelineEventsDetailsItem[] | null;
    searchHit?: SearchHit;
    id: string;
  }) => {
    const { browserFields } = useSourcererDataView(SourcererScopeName.detections);
    const { from, to, shouldUpdate, selectedPatterns } = useTimelineDataFilters(
      TimelineId.detectionsPage
    );
    const [visiblePage, setVisiblePage] = useState('event');
    const toggleButtons = [
      {
        id: 'event',
        label: 'Event data',
      },
      {
        id: 'analyzer',
        label: 'Analyzer graph',
      },
      {
        id: 'json',
        label: 'JSON',
      },
      {
        id: 'graph',
        label: 'Graph',
      },
    ];
    const onChange = (optionId: string) => {
      setVisiblePage(optionId);
    };

    return (
      <>
        {data && (
          <>
            <EuiSpacer size="m" />
            <EuiButtonGroup
              color="primary"
              idSelected={visiblePage}
              legend="Visualization pages"
              onChange={onChange}
              options={toggleButtons}
            />
            <EuiSpacer size="xl" />
            <EuiFlexGroup direction="column" style={{ height: '100%' }}>
              {visiblePage === 'event' && (
                <>
                  <EuiSpacer size="m" />
                  <EuiTitle size="m">
                    <h2>{'All fields'}</h2>
                  </EuiTitle>
                  <EuiSpacer size="m" />
                  <EventFieldsBrowser
                    browserFields={browserFields}
                    data={data}
                    eventId={id}
                    isDraggable={false}
                    timelineId={TimelineId.active}
                    timelineTabType="flyout"
                    isReadOnly={false}
                  />
                </>
              )}
              {visiblePage === 'json' && (
                <>
                  <EuiSpacer size="m" />
                  <JsonView rawEventData={searchHit} />
                </>
              )}
              {visiblePage === 'analyzer' && (
                <>
                  <EuiSpacer size="m" />
                  <Resolver
                    databaseDocumentID={id}
                    resolverComponentInstanceID={TimelineId.active}
                    indices={selectedPatterns}
                    shouldUpdate={shouldUpdate}
                    filters={{ from, to }}
                  />
                </>
              )}
              {visiblePage === 'graph' && <AlertDetailsVisualizeGraph id={id} />}
            </EuiFlexGroup>
          </>
        )}
      </>
    );
  }
);

AlertDetailsVisualizeTab.displayName = 'AlertDetailsVisualizeTab';
