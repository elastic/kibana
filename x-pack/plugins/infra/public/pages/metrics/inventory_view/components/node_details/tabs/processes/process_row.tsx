/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
import { AutoSizer } from '../../../../../../../components/auto_sizer';
import { euiStyled } from '../../../../../../../../../observability/public';
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
                <EuiDescriptionList compressed>
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
                  <EuiFlexGrid columns={2} gutterSize="s">
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
                        <CodeLine>{item.pid}</CodeLine>
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
                        <CodeLine>{item.user}</CodeLine>
                      </EuiDescriptionListDescription>
                    </EuiFlexItem>
                    <ProcessRowCharts command={item.command} />
                  </EuiFlexGrid>
                </EuiDescriptionList>
              </ExpandedRowCell>
            )}
          </AutoSizer>
        )}
      </EuiTableRow>
    </>
  );
};

export const CodeLine = euiStyled(EuiCode).attrs({
  transparentBackground: true,
})`
  text-overflow: ellipsis;
  overflow: hidden;
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
