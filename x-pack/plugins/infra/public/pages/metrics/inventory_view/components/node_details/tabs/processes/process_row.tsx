/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
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
import useToggle from 'react-use/lib/useToggle';
import {
  useObservabilityAIAssistant,
  type Message,
  MessageRole,
  ContextualInsight,
} from '@kbn/observability-ai-assistant-plugin/public';
import { Process } from './types';
import { ProcessRowCharts } from './process_row_charts';

interface Props {
  cells: React.ReactNode[];
  item: Process;
  supportAIAssistant?: boolean;
}
export const ContextualInsightProcessRow = ({ command }: { command: string }) => {
  const aiAssistant = useObservabilityAIAssistant();
  const explainProcessMessages = useMemo<Message[] | undefined>(() => {
    if (!command) {
      return undefined;
    }
    const now = new Date().toISOString();
    return [
      {
        '@timestamp': now,
        message: {
          role: MessageRole.System,
          content: '',
        },
      },
      {
        '@timestamp': now,
        message: {
          role: MessageRole.User,
          content: '',
        },
      },
    ];
  }, [command]);
  return (
    <>
      {aiAssistant.isEnabled() && explainProcessMessages ? (
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFlexItem grow={false}>
              <ContextualInsight
                title={explainProcessMessageTitle}
                messages={explainProcessMessages}
              />
            </EuiFlexItem>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : null}
    </>
  );
};

export const ProcessRow = ({ cells, item, supportAIAssistant = false }: Props) => {
  const [isExpanded, toggle] = useToggle(false);

  return (
    <>
      <EuiTableRow>
        <EuiTableRowCell isExpander textOnly={false}>
          <EuiButtonEmpty
            data-test-subj="infraProcessRowButton"
            iconType={isExpanded ? 'arrowDown' : 'arrowRight'}
            aria-expanded={isExpanded}
            onClick={toggle}
          />
        </EuiTableRowCell>
        {cells}
      </EuiTableRow>
      <EuiTableRow isExpandable isExpandedRow={isExpanded}>
        {isExpanded && (
          <ExpandedRowCell>
            <EuiSpacer size="s" />
            <ExpandedRowDescriptionList>
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem>
                  <div>
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
                    <EuiButton data-test-subj="infraProcessRowViewTraceInApmButton">
                      {i18n.translate('xpack.infra.metrics.nodeDetails.processes.viewTraceInAPM', {
                        defaultMessage: 'View trace in APM',
                      })}
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
              {supportAIAssistant && <ContextualInsightProcessRow command={item.command} />}
            </ExpandedRowDescriptionList>
          </ExpandedRowCell>
        )}
      </EuiTableRow>
    </>
  );
};

const explainProcessMessageTitle = i18n.translate(
  'xpack.infra.hostFlyout.explainProcessMessageTitle',
  {
    defaultMessage: "What's this process?",
  }
);

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
})`
  padding-top: ${(props) => props.theme.eui.euiSizeM} !important;
  padding-bottom: ${(props) => props.theme.eui.euiSizeM} !important;
  background-color: ${(props) => props.theme.eui.euiColorLightestShade};
`;
