/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import {
  INDICATOR_DATASET,
  INDICATOR_MATCHED_TYPE,
  INDICATOR_PROVIDER,
  INDICATOR_REFERENCE,
} from '../../../../../../../common/cti/constants';
import { DraggableBadge } from '../../../../../../common/components/draggables';

interface IndicatorDetailsProps {
  contextId: string;
  eventId: string;
  indicatorDataset: string | undefined;
  indicatorProvider: string | undefined;
  indicatorReference: string | undefined;
  indicatorType: string | undefined;
}

export const IndicatorDetails: React.FC<IndicatorDetailsProps> = ({
  contextId,
  eventId,
  indicatorDataset,
  indicatorProvider,
  indicatorReference,
  indicatorType,
}) => (
  <EuiFlexGroup
    alignItems="flexStart"
    data-test-subj="threat-match-indicator-details"
    direction="row"
    justifyContent="center"
    gutterSize="none"
  >
    <EuiFlexItem grow={false}>
      <DraggableBadge
        contextId={contextId}
        data-test-subj="threat-match-indicator-details-indicator-type"
        eventId={eventId}
        field={INDICATOR_MATCHED_TYPE}
        value={indicatorType}
      />
    </EuiFlexItem>
    {''}
    <EuiFlexItem grow={false}>
      <DraggableBadge
        contextId={contextId}
        data-test-subj="threat-match-indicator-details-indicator-dataset"
        eventId={eventId}
        field={INDICATOR_DATASET}
        value={indicatorDataset}
      />
    </EuiFlexItem>
    {'via'}
    <EuiFlexItem grow={false}>
      <DraggableBadge
        contextId={contextId}
        data-test-subj="threat-match-indicator-details-indicator-provider"
        eventId={eventId}
        field={INDICATOR_PROVIDER}
        value={indicatorProvider}
      />
    </EuiFlexItem>
    {':'}
    <EuiFlexItem grow={false}>
      <DraggableBadge
        contextId={contextId}
        data-test-subj="threat-match-indicator-details-indicator-reference"
        eventId={eventId}
        field={INDICATOR_REFERENCE}
        value={indicatorReference}
      />
    </EuiFlexItem>
  </EuiFlexGroup>
);
