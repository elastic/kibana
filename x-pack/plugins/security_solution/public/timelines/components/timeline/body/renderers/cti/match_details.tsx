/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { INDICATOR_MATCHED_FIELD } from '../../../../../../../common/cti/constants';
import { DraggableBadge } from '../../../../../../common/components/draggables';

interface MatchDetailsProps {
  contextId: string;
  eventId: string;
  sourceField: string;
  sourceValue: string;
}

export const MatchDetails: React.FC<MatchDetailsProps> = ({
  contextId,
  eventId,
  sourceField,
  sourceValue,
}) => (
  <EuiFlexGroup
    alignItems="flexStart"
    data-test-subj="threat-match-details"
    direction="row"
    justifyContent="center"
    gutterSize="none"
  >
    {'match found on'}
    <EuiFlexItem grow={false}>
      <DraggableBadge
        contextId={contextId}
        data-test-subj="threat-match-details-source-field"
        eventId={eventId}
        field={INDICATOR_MATCHED_FIELD}
        value={sourceField}
      />
    </EuiFlexItem>
    {'whose value was'}
    <EuiFlexItem grow={false}>
      <DraggableBadge
        contextId={contextId}
        data-test-subj="threat-match-details-source-value"
        eventId={eventId}
        field={sourceField}
        value={sourceValue}
      />
    </EuiFlexItem>
  </EuiFlexGroup>
);
