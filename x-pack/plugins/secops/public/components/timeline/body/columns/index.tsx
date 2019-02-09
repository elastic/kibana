/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import * as React from 'react';
import styled from 'styled-components';

import { Ecs } from '../../../../graphql/types';
import { getAllFieldsInSchemaByMappedName, virtualEcsSchema } from '../../../../lib/ecs';
import { ColumnHeader } from '../column_headers/column_header';
import { ColumnRenderer, getColumnRenderer } from '../renderers';

interface Props {
  columnHeaders: ColumnHeader[];
  columnRenderers: ColumnRenderer[];
  ecs: Ecs;
}

interface State {
  expanded: { [eventId: string]: boolean };
  showNotes: { [eventId: string]: boolean };
}

const DataDrivenColumns = styled(EuiFlexGroup)`
  margin-left: 5px;
`;

const Column = styled.div<{
  disableTextWrap?: boolean;
  minWidth: string;
  maxWidth: string;
  index: number;
}>`
  background: ${({ index, theme }) => (index % 2 === 0 ? theme.eui.euiColorLightShade : 'inherit')};
  height: 100%;
  max-width: ${({ maxWidth }) => maxWidth};
  min-width: ${({ minWidth }) => minWidth};
  overflow: hidden;
  overflow-wrap: ${({ disableTextWrap }) => (disableTextWrap ? 'normal' : 'break-word')};
  padding: 5px;
  white-space: ${({ disableTextWrap }) => (disableTextWrap ? 'nowrap' : 'normal')};
`;

const allFieldsInSchemaByName = getAllFieldsInSchemaByMappedName(virtualEcsSchema);

export class Columns extends React.PureComponent<Props, State> {
  public readonly state: State = {
    expanded: {},
    showNotes: {},
  };

  public render() {
    const { columnHeaders, columnRenderers, ecs } = this.props;

    return (
      <DataDrivenColumns data-test-subj="data-driven-columns" gutterSize="none">
        {columnHeaders.map((header, index) => (
          <EuiFlexItem grow={true} key={header.id}>
            <Column
              data-test-subj="column"
              disableTextWrap={header.disableTextWrap}
              index={index}
              maxWidth="100%"
              minWidth={`${header.minWidth}px`}
            >
              {getColumnRenderer(header.id, columnRenderers, ecs).renderColumn(
                header.id,
                ecs,
                allFieldsInSchemaByName[header.id]
              )}
            </Column>
          </EuiFlexItem>
        ))}
      </DataDrivenColumns>
    );
  }
}
