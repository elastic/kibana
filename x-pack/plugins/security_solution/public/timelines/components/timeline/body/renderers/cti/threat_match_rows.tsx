/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import React from 'react';

import { Ecs } from '../../../../../../../common/ecs';
import { ParsedFields, TimelineNonEcsData } from '../../../../../../../common/search_strategy';
import { RowRendererContainer } from '../row_renderer';
import { ThreatMatchRow } from './threat_match_row';

export const ThreatMatchRows = ({
  data,
  flattenedData,
}: {
  data: Ecs;
  flattenedData?: TimelineNonEcsData[];
}) => {
  const indicators = get(data, 'threat.indicator') as ParsedFields[];

  return (
    <RowRendererContainer data-test-subj="threat-match-row-renderer">
      {indicators.map((fields, index) => (
        <ThreatMatchRow key={index} fields={fields} />
      ))}
    </RowRendererContainer>
  );
};
