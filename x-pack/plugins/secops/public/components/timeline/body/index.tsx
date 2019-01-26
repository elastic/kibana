/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon, EuiText } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { Ecs } from '../../../graphql/types';
import { StatefulEventDetails } from '../../event_details/stateful_event_details';
import { LazyAccordion } from '../../lazy_accordion';
import { ColumnHeader } from './column_headers/column_header';
import { ColumnRenderer, getColumnRenderer, getRowRenderer, RowRenderer } from './renderers';

interface Props {
  columnHeaders: ColumnHeader[];
  columnRenderers: ColumnRenderer[];
  data: Ecs[];
  height: number;
  id: string;
  rowRenderers: RowRenderer[];
}

const ScrollableArea = styled.div<{
  height: number;
}>`
  display: block;
  height: ${({ height }) => `${height}px`};
  overflow: auto;
  min-height: 0px;
`;

const Row = styled.div`
  display: flex;
  flex-direction: row;
  padding: 0;
  min-height: 40px;
`;

const FlexRow = styled.span`
  display: flex;
  flex-direction: row;
`;

// NOTE: overflow-wrap: break-word is required below to render data that is too
// long to fit in a cell, but has no breaks because, for example, it's a
// single large value (e.g. 985205274836907)
const Cell = styled(EuiText)`
  overflow: hidden;
  margin-right: 6px;
  overflow-wrap: break-word;
`;

const TimeGutter = styled.span`
  min-width: 50px;
  background-color: ${props => props.theme.eui.euiColorLightShade};
`;

const Pin = styled(EuiIcon)`
  min-width: 50px;
  margin-right: 8px;
  margin-top: 5px;
  transform: rotate(45deg);
  color: grey;
`;

const DataDrivenColumns = styled.div`
  display: flex;
  margin-left: 5px;
  width: 100%;
`;

const ColumnRender = styled.div<{
  minwidth: string;
  maxwidth: string;
  index: number;
}>`
  max-width: ${props => props.minwidth};
  min-width: ${props => props.maxwidth};
  background: ${props => (props.index % 2 !== 0 ? props.theme.eui.euiColorLightShade : 'inherit')};
  padding: 5px;
`;

export const defaultWidth = 1090;

const ExpandableDetails = styled.div`
  width: 100%;
`;

/** Renders the timeline body */
export const Body = pure<Props>(
  ({ columnHeaders, columnRenderers, data, height, id, rowRenderers }) => (
    <ScrollableArea height={height} data-test-subj="scrollableArea">
      {data.map(ecs => (
        <Row key={ecs._id!}>
          <TimeGutter />
          {getRowRenderer(ecs, rowRenderers).renderRow(
            ecs,
            <>
              <FlexRow>
                <Pin type="pin" size="l" />
                <DataDrivenColumns data-test-subj="dataDrivenColumns">
                  {columnHeaders.map((header, index) => (
                    <ColumnRender
                      key={`cell-${header.id}`}
                      data-test-subj="cellContainer"
                      maxwidth={`${header.minWidth}px`}
                      minwidth={`${header.minWidth}px`}
                      index={index}
                    >
                      <Cell size="xs">
                        {getColumnRenderer(header.id, columnRenderers, ecs).renderColumn(
                          header.id,
                          ecs
                        )}
                      </Cell>
                    </ColumnRender>
                  ))}
                </DataDrivenColumns>
              </FlexRow>
              <FlexRow>
                <ExpandableDetails data-test-subj="expandableDetails">
                  <LazyAccordion
                    id={`timeline-${id}-row-${ecs._id}`}
                    buttonContent={`${JSON.stringify(ecs.event) || {}}`} // TODO: this should be `event.message` or `event._source`
                    paddingSize="none"
                  >
                    <StatefulEventDetails data={ecs} />
                  </LazyAccordion>
                </ExpandableDetails>
              </FlexRow>
            </>
          )}
        </Row>
      ))}
    </ScrollableArea>
  )
);
