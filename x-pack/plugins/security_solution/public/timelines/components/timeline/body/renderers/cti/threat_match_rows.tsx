/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { TimelineNonEcsData } from '../../../../../../../common/search_strategy';
import { RowRendererContainer } from '../row_renderer';
import { isRequiredField, isThreatMatchField } from './helpers';
import { ThreatMatchRow } from './threat_match_row';

const sliceThreatMatchFields = (
  fields: TimelineNonEcsData[],
  index: number
): TimelineNonEcsData[] =>
  fields
    .filter((field) => isRequiredField(field))
    .map((field) => ({
      field: field.field,
      value: field.value ? [field.value[index]] : undefined,
    }));

export const ThreatMatchRows = ({ flattenedData }: { flattenedData?: TimelineNonEcsData[] }) => {
  const threatMatchCount =
    flattenedData?.find((field) => isThreatMatchField(field))?.value?.length ?? 0;
  const slicedThreatMatchFields = Array.from(Array(threatMatchCount)).map((_, index) =>
    sliceThreatMatchFields(flattenedData ?? [], index)
  );

  return (
    <RowRendererContainer data-test-subj="threat-match-row-renderer">
      {slicedThreatMatchFields?.map((fields, index) => (
        <ThreatMatchRow key={index} fields={fields} />
      ))}
    </RowRendererContainer>
  );
};
