/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHorizontalRule } from '@elastic/eui';
import { get } from 'lodash';
import React, { Fragment } from 'react';
import styled from 'styled-components';

import { ENRICHMENT_DESTINATION_PATH } from '../../../../../../../common/constants';
import { RowRenderer } from '../../../../../../../common/types';
import { Fields } from '../../../../../../../common/search_strategy';
import { ID_FIELD_NAME } from '../../../../../../common/components/event_details/event_id';
import { RowRendererContainer } from '../row_renderer';
import { ThreatMatchRow } from './threat_match_row';

const SpacedContainer = styled.div`
  margin: ${({ theme }) => theme.eui.paddingSizes.s} 0;
`;

export const ThreatMatchRows: RowRenderer['renderRow'] = ({ data, isDraggable, timelineId }) => {
  const indicators = get(data, ENRICHMENT_DESTINATION_PATH) as Fields[];
  const eventId = get(data, ID_FIELD_NAME);

  return (
    <RowRendererContainer data-test-subj="threat-match-row-renderer">
      <SpacedContainer>
        {indicators.map((indicator, index) => {
          const contextId = `threat-match-row-${timelineId}-${eventId}-${index}`;
          return (
            <Fragment key={contextId}>
              <ThreatMatchRow
                contextId={contextId}
                data={indicator}
                eventId={eventId}
                isDraggable={isDraggable}
              />
              {index < indicators.length - 1 && <EuiHorizontalRule margin="s" />}
            </Fragment>
          );
        })}
      </SpacedContainer>
    </RowRendererContainer>
  );
};
