/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import React from 'react';

import { Fields } from '../../../../../../../common/search_strategy';
import { ID_FIELD_NAME } from '../../../../../../common/components/event_details/event_id';
import { RowRenderer, RowRendererContainer } from '../row_renderer';
import { ThreatMatchRow } from './threat_match_row';

export const ThreatMatchRows: RowRenderer['renderRow'] = ({ data, timelineId }) => {
  const indicators = get(data, 'threat.indicator') as Fields[];
  const eventId = get(data, ID_FIELD_NAME);

  return (
    <RowRendererContainer data-test-subj="threat-match-row-renderer">
      {indicators.map((indicator, index) => (
        <ThreatMatchRow
          // TODO index should be replaced with matched.id when it is available
          key={`threat-match-row-${eventId}-${index}`}
          data={indicator}
          eventId={eventId}
          timelineId={timelineId}
        />
      ))}
    </RowRendererContainer>
  );
};
