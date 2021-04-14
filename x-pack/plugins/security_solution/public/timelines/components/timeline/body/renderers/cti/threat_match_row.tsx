/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import React from 'react';

import { Fields } from '../../../../../../../common/search_strategy';
import {
  EVENT_DATASET,
  EVENT_REFERENCE,
  MATCHED_ATOMIC,
  MATCHED_FIELD,
  MATCHED_TYPE,
  PROVIDER,
} from '../../../../../../../common/cti/constants';
import { MatchDetails } from './match_details';
import { IndicatorDetails } from './indicator_details';

export interface ThreatMatchRowProps {
  contextId: string;
  eventId: string;
  indicatorDataset: string | undefined;
  indicatorProvider: string | undefined;
  indicatorReference: string | undefined;
  indicatorType: string | undefined;
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
    indicatorDataset: get(data, EVENT_DATASET)[0] as string | undefined,
    indicatorReference: get(data, EVENT_REFERENCE)[0] as string | undefined,
    indicatorProvider: get(data, PROVIDER)[0] as string | undefined,
    indicatorType: get(data, MATCHED_TYPE)[0] as string | undefined,
    sourceField: get(data, MATCHED_FIELD)[0] as string,
    sourceValue: get(data, MATCHED_ATOMIC)[0] as string,
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
      <MatchDetails
        contextId={contextId}
        eventId={eventId}
        sourceField={sourceField}
        sourceValue={sourceValue}
      />
      <IndicatorDetails
        contextId={contextId}
        eventId={eventId}
        indicatorDataset={indicatorDataset}
        indicatorProvider={indicatorProvider}
        indicatorReference={indicatorReference}
        indicatorType={indicatorType}
      />
    </>
  );
};
