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
  // TODO this code sucks and we should get rid of it
  // where do our threat fields get flattened like this? it's not in the fields response itself
  // it comes from the backend, so it must be the search strategy

  const threatMatchCount = flattenedData?.find((field) => isThreatMatchField(field))?.value;
  const t = threatMatchCount?.length ?? 0;
  console.log('threatMatchCount', threatMatchCount);
  const slicedThreatMatchFields = Array.from(Array(t)).map((_, index) =>
    sliceThreatMatchFields(flattenedData ?? [], index)
  );

  return (
    <RowRendererContainer data-test-subj="threat-match-row-renderer">
      {slicedThreatMatchFields?.map((fields, index) => (
        // TODO object with keys instead of fields
        <ThreatMatchRow key={index} fields={fields} />
      ))}
    </RowRendererContainer>
  );
};
