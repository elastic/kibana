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
  useEuiTheme,
} from '@elastic/eui';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import useToggle from 'react-use/lib/useToggle';
import { type Message } from '@kbn/observability-ai-assistant-plugin/public';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { Process } from './types';
import { ProcessRowCharts } from './process_row_charts';

interface Props {
  cells: React.ReactNode[];
  item: Process;
  supportAIAssistant?: boolean;
}
export const ContextualInsightProcessRow = ({ command }: { command: string }) => {
  const { observabilityAIAssistant } = useKibanaContextForPlugin().services;

  const explainProcessMessages = useMemo<Message[] | undefined>(() => {
    if (!command || !observabilityAIAssistant) {
      return undefined;
    }

    return observabilityAIAssistant.getContextualInsightMessages({
      message: `I am a software engineer. I am trying to understand what this process running on my
      machine does.`,
      instructions: `Your task is to first describe what the process is and what its general use cases are. If I also provide you
      with the arguments to the process you should then explain its arguments and how they influence the behaviour
      of the process. If I do not provide any arguments then explain the behaviour of the process when no arguments are
      provided.

      Here is an example with arguments.
      Process: metricbeat -c /etc/metricbeat.yml -d autodiscover,kafka -e -system.hostfs=/hostfs
      Explanation: Metricbeat is part of the Elastic Stack. It is a lightweight shipper that you can install on your
      servers to periodically collect metrics from the operating system and from services running on the server.
      Use cases for Metricbeat generally revolve around infrastructure monitoring. You would typically install
      Metricbeat on your servers to collect metrics from your systems and services. These metrics are then
      used for performance monitoring, anomaly detection, system status checks, etc.
      Here is a breakdown of the arguments used:
      * -c /etc/metricbeat.yml: The -c option is used to specify the configuration file for Metricbeat. In
      this case, /etc/metricbeat.yml is the configuration file. This file contains configurations for what
      metrics to collect and where to send them (e.g., to Elasticsearch or Logstash).
      * -d autodiscover,kafka: The -d option is used to enable debug output for selected components. In
      this case, debug output is enabled for autodiscover and kafka components. The autodiscover feature
      allows Metricbeat to automatically discover services as they get started and stopped in your environment,
      and kafka is presumably a monitored service from which Metricbeat collects metrics.
      * -e: The -e option is used to log to stderr and disable syslog/file output. This is useful for debugging.
      * -system.hostfs=/hostfs: The -system.hostfs option is used to set the mount point of the host’s
      filesystem for use in monitoring a host from within a container. In this case, /hostfs is the mount
      point. When running Metricbeat inside a container, filesystem metrics would be for the container by
      default, but with this option, Metricbeat can get metrics for the host system.
      Here is an example without arguments.
      Process: metricbeat
      Explanation: Metricbeat is part of the Elastic Stack. It is a lightweight shipper that you can install on your
      servers to periodically collect metrics from the operating system and from services running on the server.
      Use cases for Metricbeat generally revolve around infrastructure monitoring. You would typically install
      Metricbeat on your servers to collect metrics from your systems and services. These metrics are then
      used for performance monitoring, anomaly detection, system status checks, etc.
      Running it without any arguments will start the process with the default configuration file, typically
      located at /etc/metricbeat/metricbeat.yml. This file specifies the metrics to be collected and where
      to ship them to.
      Now explain this process to me.
      Process: ${command}
      Explanation:`,
    });
  }, [command, observabilityAIAssistant]);
  return (
    <>
      {observabilityAIAssistant?.ObservabilityAIAssistantContextualInsight &&
      explainProcessMessages ? (
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFlexItem grow={false}>
              <observabilityAIAssistant.ObservabilityAIAssistantContextualInsight
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
                <ProcessRowCharts
                  command={item.command}
                  hasCpuData={item.cpu !== null}
                  hasMemoryData={item.memory !== null}
                />
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
  padding-top: ${() => {
    const { euiTheme } = useEuiTheme();
    return euiTheme.size.m;
  }} !important;
  padding-bottom: ${() => {
    const { euiTheme } = useEuiTheme();
    return euiTheme.size.m;
  }} !important;
  background-color: ${() => {
    const { euiTheme } = useEuiTheme();
    return euiTheme.colors.lightestShade;
  }};
`;
