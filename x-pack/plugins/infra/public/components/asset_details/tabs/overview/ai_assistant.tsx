/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import {
  type Message,
  MessageRole,
  type ObservabilityAIAssistantPluginStart,
} from '@kbn/observability-ai-assistant-plugin/public';
import { TimeRange } from '@kbn/es-query';

export interface InfraAIAssistantProps {
  assetName: string;
  assetType: string;
  observabilityAIAssistant: ObservabilityAIAssistantPluginStart;
  dateRange: TimeRange;
}

export const AIAssistant = ({
  assetName,
  assetType,
  dateRange,
  observabilityAIAssistant: { ObservabilityAIAssistantContextualInsight },
}: InfraAIAssistantProps) => {
  const explainLogMessageMessages = useMemo<Message[] | undefined>(() => {
    const now = new Date().toISOString();

    return [
      {
        '@timestamp': now,
        message: {
          role: MessageRole.User,
          content: `I'm a SRE looking at my Infrastructure. I want to understand the impacts of active alerts on ${assetName} on the APM services within the time range starting from ${dateRange.from} and ending at ${dateRange.to}.

You must first gather the necessary information and you must return a single reply encompassing your entire analysis. Do not break the reply into multiple messages.

Your goal is to assess the impact of the active alerts on ${assetName} on the services and find out the root cause. First, briefly explain the alerts on ${assetName}.
For the complete analysis, it's important that you analyse APM services SLOs. If you don't find any SLOs, please suggest creating one. If there are sertvices SLOs, try to predict whether they will be violated if the current trend continues.
For the impact assessment, you will need to get the list of APM services filtered by ${assetType} ${assetName} within the time range. For each service you'll need to get their throughput, failure rate, latency metrics. These metrics are important for your analysis. 
Determine whether and how the APM service metrics, SLO and SLI have been impacted by the alert on ${assetName} and current ${assetName} metrics. Briefly explain how it might affects users and correlation with the alert. 
For the root cause analysis, you will need to locate change points in the APM services metrics running on the ${assetType} ${assetName} within the time range and correlate them with the ${assetType} ${assetName} metrics. 
Determine which one (services utilization, ${assetType} saturation) could've triggered the alert on ${assetName} or SLO violation, and why. If ${assetName} doesn't seem to be impacting the service metrics, hint what might that be.
Don't look for alerts on services, only on ${assetType}.

You will present three tables in your analysis: 
The first table will have the ${assetType} ${assetName} and its metrics, being a row for each ${assetType} ${assetName}. 
The second table will have all APM services found, their throughput, failure rate, latency metrics and their corresponding SLO status, being a row for each service. You will match the service name to get the corresponding SLO status.
The third table will have the details of the SLOs that you have found, being a row for each SLO.

At the end, ask if you should run the same impact assessment and root cause analysis of other instances that are running the services whose metrics have experienced impacts or with violated SLOs. 
If there are no impacts or violated SLOs, do not ask if you should analyze other instances.

Upon confirmation, you will get the APM services overview statistics, which will give all metrics you need, and perform the analysis to determine if they have similar saturation problems. 
Do not retrive alerts, SLOs and APM metrics data again.
You will present a for each APM service, in each section you will present a table with their corresponding overview of the infrastructure.
The table will have the Asset Name and their CPU Usage (percentage), Memory Usage (percentage), Lantency (milliseconds), Throughput (transactions per minute), Error Rate (percentage) metrics, being a row for each SLO. 
The table will be sorted by the metric that triggered the alert. 

Do not display to the user the process of your analysis. If there are no alerts on ${assetName}, consider the ${assetType} ${assetName} metrics if to see its metrics are saturated and suggest setting up alerts.

Format all SLO names as HTML link. The link will open the SLO Details page.
The href is \`/app/observability/slos/SLO_ID\`
The label is the name of the SLO.

Format all service names as HTML link. The link will open the APM Service Overview page.
The href is \`/app/apm/services/SERVICE_NAME/overview?rangeFrom=START&rangeTo=END\`
The label is the name of the service.

Format all host names as HTML link. The link will open the Host Details page.
The href is \`/app/metrics/detail/host/HOST_NAME/?assetDetails:(dateRange:(from:START,to=END))\`
The label is the name of the host.
          `,
        },
      },
    ];
  }, [assetName, assetType, dateRange.from, dateRange.to]);

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {ObservabilityAIAssistantContextualInsight && explainLogMessageMessages ? (
        <EuiFlexItem grow={false}>
          <ObservabilityAIAssistantContextualInsight
            title={'Explain alert'}
            messages={explainLogMessageMessages}
            dataTestSubj="obsAiAssistantInsightButtonExplainAlert"
          />
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};

// eslint-disable-next-line import/no-default-export
export default AIAssistant;
