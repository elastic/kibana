/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, getOr } from 'lodash/fp';
import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import type { Fields } from '../../../../../../../common/search_strategy';
import {
  MATCHED_ATOMIC,
  MATCHED_FIELD,
  MATCHED_TYPE,
  REFERENCE,
  FEED_NAME,
} from '../../../../../../../common/cti/constants';
import { MatchDetails } from './match_details';
import { IndicatorDetails } from './indicator_details';

export interface ThreatMatchRowProps {
  contextId: string;
  eventId: string;
  feedName?: string;
  indicatorReference?: string;
  indicatorType?: string;
  isDraggable?: boolean;
  sourceField: string;
  sourceValue: string;
}

export const ThreatMatchRow = ({
  contextId,
  data,
  eventId,
  isDraggable,
}: {
  contextId: string;
  data: Fields;
  eventId: string;
  isDraggable?: boolean;
}) => {
  const props = {
    contextId,
    eventId,
    indicatorReference: getOr([], REFERENCE, data)[0] as string | undefined,
    feedName: getOr([], FEED_NAME, data)[0] as string | undefined,
    indicatorType: getOr([], MATCHED_TYPE, data)[0] as string | undefined,
    isDraggable,
    sourceField: get(MATCHED_FIELD, data)[0] as string,
    sourceValue: get(MATCHED_ATOMIC, data)[0] as string,
  };

  return <ThreatMatchRowView {...props} />;
};

export const ThreatMatchRowView = ({
  contextId,
  eventId,
  feedName,
  indicatorReference,
  indicatorType,
  isDraggable,
  sourceField,
  sourceValue,
}: ThreatMatchRowProps) => {
  return (
    <EuiFlexGroup
      alignItems="center"
      data-test-subj="threat-match-row"
      gutterSize="s"
      justifyContent="center"
    >
      <EuiFlexItem grow={false}>
        <MatchDetails
          contextId={contextId}
          eventId={eventId}
          isDraggable={isDraggable}
          sourceField={sourceField}
          sourceValue={sourceValue}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <IndicatorDetails
          contextId={contextId}
          eventId={eventId}
          feedName={feedName}
          indicatorReference={indicatorReference}
          indicatorType={indicatorType}
          isDraggable={isDraggable}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
