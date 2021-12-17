/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { INDICATOR_MATCHED_FIELD } from '../../../../../../../common/cti/constants';
import { DraggableBadge } from '../../../../../../common/components/draggables';
import { HorizontalSpacer } from './helpers';

interface MatchDetailsProps {
  contextId: string;
  eventId: string;
  isDraggable?: boolean;
  sourceField: string;
  sourceValue: string;
}

export const MatchDetails: React.FC<MatchDetailsProps> = ({
  contextId,
  eventId,
  isDraggable,
  sourceField,
  sourceValue,
}) => (
  <EuiFlexGroup
    alignItems="center"
    data-test-subj="threat-match-details"
    direction="row"
    justifyContent="center"
    gutterSize="none"
    wrap
  >
    <EuiFlexItem grow={false}>
      <DraggableBadge
        contextId={contextId}
        data-test-subj="threat-match-details-source-field"
        eventId={eventId}
        field={INDICATOR_MATCHED_FIELD}
        isDraggable={isDraggable}
        value={sourceField}
      />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <HorizontalSpacer>
        <FormattedMessage
          defaultMessage="matched"
          id="xpack.securitySolution.alerts.rowRenderers.cti.threatMatch.matchedVerb"
        />
      </HorizontalSpacer>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <DraggableBadge
        contextId={contextId}
        data-test-subj="threat-match-details-source-value"
        eventId={eventId}
        field={sourceField}
        isDraggable={isDraggable}
        value={sourceValue}
      />
    </EuiFlexItem>
  </EuiFlexGroup>
);
