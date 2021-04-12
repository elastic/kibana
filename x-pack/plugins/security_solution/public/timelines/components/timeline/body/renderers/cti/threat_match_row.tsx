/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';

import { Fields } from '../../../../../../../common/search_strategy';
import { DraggableBadge } from '../../../../../../common/components/draggables';

export interface ThreatMatchRowProps {
  contextId: string;
  eventId: string;
  indicatorDataset: string;
  indicatorProvider: string;
  indicatorReference: string;
  indicatorType: string;
  sourceField: string;
  sourceValue: string;
}

export const ThreatMatchRow = ({
  data,
  eventId,
  timelineId,
}: {
  data: Fields;
  eventId: string;
  timelineId: string;
}) => {
  const props = {
    contextId: `threat-match-row-${timelineId}-${eventId}`,
    eventId,
    indicatorDataset: get(data, 'event.dataset')[0] as string,
    indicatorReference: get(data, 'event.reference')[0] as string,
    indicatorProvider: get(data, 'provider')[0] as string,
    indicatorType: get(data, 'matched.type')[0] as string,
    sourceField: get(data, 'matched.field')[0] as string,
    sourceValue: get(data, 'matched.atomic')[0] as string,
  };

  return <ThreatMatchRowView {...props} />;
};

export const ThreatMatchRowView = ({
  contextId,
  eventId,
  indicatorDataset,
  indicatorProvider,
  indicatorReference,
  indicatorType,
  sourceField,
  sourceValue,
}: ThreatMatchRowProps) => {
  return (
    <>
      <EuiFlexGroup
        alignItems="flexStart"
        direction="row"
        justifyContent="center"
        gutterSize="none"
      >
        <EuiFlexItem grow={false}>
          <DraggableBadge
            contextId={contextId}
            data-test-subj="threat-match-row-indicator-type"
            eventId={eventId}
            field={'threat.indicator.matched.type'}
            value={indicatorType}
          />
        </EuiFlexItem>
        {'indicator matched on'}
        <EuiFlexItem grow={false}>
          <DraggableBadge
            contextId={contextId}
            data-test-subj="threat-match-row-source-field"
            eventId={eventId}
            field={'threat.indicator.matched.field'}
            value={sourceField}
          />
        </EuiFlexItem>
        {', whose value was'}
        <EuiFlexItem grow={false}>
          <DraggableBadge
            contextId={contextId}
            data-test-subj="threat-match-row-source-value"
            eventId={eventId}
            field={sourceField}
            value={sourceValue}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup
        alignItems="flexStart"
        data-test-subj="threat-match-row"
        direction="row"
        justifyContent="center"
        gutterSize="none"
      >
        <EuiFlexItem grow={false}>
          <DraggableBadge
            contextId={contextId}
            data-test-subj="threat-match-row-indicator-dataset"
            eventId={eventId}
            field={'threat.indicator.event.dataset'}
            value={indicatorDataset}
          />
        </EuiFlexItem>
        {'via'}
        <EuiFlexItem grow={false}>
          <DraggableBadge
            contextId={contextId}
            data-test-subj="threat-match-row-indicator-provider"
            eventId={eventId}
            field={'threat.indicator.provider'}
            value={indicatorProvider}
          />
        </EuiFlexItem>
        {':'}
        <EuiFlexItem grow={false}>
          <DraggableBadge
            contextId={contextId}
            data-test-subj="threat-match-row-indicator-reference"
            eventId={eventId}
            field={'threat.indicator.event.reference'}
            value={indicatorReference}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
