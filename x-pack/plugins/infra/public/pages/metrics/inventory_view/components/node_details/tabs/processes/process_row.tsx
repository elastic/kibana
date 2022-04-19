/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiTableRow,
  EuiTableRowCell,
  EuiButtonEmpty,
  EuiCode,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiSpacer,
} from '@elastic/eui';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { AutoSizer } from '../../../../../../../components/auto_sizer';
import { Process } from './types';
import { ProcessRowCharts } from './process_row_charts';

interface Props {
  cells: React.ReactNode[];
  item: Process;
}

export const ProcessRow = ({ cells, item }: Props) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <EuiTableRow>
        <EuiTableRowCell isExpander textOnly={false}>
          <EuiButtonEmpty
            iconType={isExpanded ? 'arrowDown' : 'arrowRight'}
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded(!isExpanded)}
          />
        </EuiTableRowCell>
        {cells}
      </EuiTableRow>
      <EuiTableRow isExpandable isExpandedRow={isExpanded}>
        {isExpanded && (
          <AutoSizer bounds>
            {({ measureRef, bounds: { height = 0 } }) => (
              <ExpandedRowCell commandHeight={height}>
                <EuiSpacer size="s" />
                <ExpandedRowDescriptionList>
                  <EuiFlexGroup gutterSize="s">
                    <EuiFlexItem>
                      <div ref={measureRef}>
                        <EuiDescriptionListTitle>
                          {i18n.translate(
                            'xpack.infra.metrics.nodeDetails.processes.expandedRowLabelCommand',
                            {
                              defaultMessage: 'Command',
                            }
                          )}
                        </EuiDescriptionListTitle>
                        <EuiDescriptionListDescription>
                          <ExpandedCommandLine>{item.command}</ExpandedCommandLine>
                        </EuiDescriptionListDescription>
                      </div>
                    </EuiFlexItem>
                    {item.apmTrace && (
                      <EuiFlexItem grow={false}>
                        <EuiButton>
                          {i18n.translate(
                            'xpack.infra.metrics.nodeDetails.processes.viewTraceInAPM',
                            {
                              defaultMessage: 'View trace in APM',
                            }
                          )}
                        </EuiButton>
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                  <EuiFlexGrid columns={2} gutterSize="s" responsive={false}>
                    <EuiFlexItem>
                      <EuiDescriptionListTitle>
                        {i18n.translate(
                          'xpack.infra.metrics.nodeDetails.processes.expandedRowLabelPID',
                          {
                            defaultMessage: 'PID',
                          }
                        )}
                      </EuiDescriptionListTitle>
                      <EuiDescriptionListDescription>
                        <CodeListItem>{item.pid}</CodeListItem>
                      </EuiDescriptionListDescription>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiDescriptionListTitle>
                        {i18n.translate(
                          'xpack.infra.metrics.nodeDetails.processes.expandedRowLabelUser',
                          {
                            defaultMessage: 'User',
                          }
                        )}
                      </EuiDescriptionListTitle>
                      <EuiDescriptionListDescription>
                        <CodeListItem>{item.user}</CodeListItem>
                      </EuiDescriptionListDescription>
                    </EuiFlexItem>
                    <ProcessRowCharts command={item.command} />
                  </EuiFlexGrid>
                </ExpandedRowDescriptionList>
              </ExpandedRowCell>
            )}
          </AutoSizer>
        )}
      </EuiTableRow>
    </>
  );
};

const ExpandedRowDescriptionList = euiStyled(EuiDescriptionList).attrs({
  compressed: true,
})`
  width: 100%;
`;

const CodeListItem = euiStyled(EuiCode).attrs({
  transparentBackground: true,
})`
  padding: 0 !important;
  & code.euiCodeBlock__code {
    white-space: nowrap !important;
    vertical-align: middle;
  }
`;

const ExpandedCommandLine = euiStyled(EuiCode).attrs({
  transparentBackground: true,
})`
  padding: 0 !important;
  margin-bottom: ${(props) => props.theme.eui.euiSizeS};
`;

const ExpandedRowCell = euiStyled(EuiTableRowCell).attrs({
  textOnly: false,
  colSpan: 6,
})<{ commandHeight: number }>`
  height: ${(props) => props.commandHeight + 240}px;
  padding: 0 ${(props) => props.theme.eui.paddingSizes.m};
  background-color: ${(props) => props.theme.eui.euiColorLightestShade};
`;
