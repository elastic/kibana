/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import dedent from 'dedent';
import { i18n } from '@kbn/i18n';
import {
  EntityWithSource,
  LogPattern,
  GetInvestigationResponse,
  EntityLogPatterns,
} from '@kbn/investigation-shared';
import React, { useCallback } from 'react';
import { useKibana } from '../../../../hooks/use_kibana';
import { useInvestigation } from '../../contexts/investigation_context';
import { useFetchEntities } from '../../../../hooks/use_fetch_entities';
import { useFetchLogPatterns } from '../../../../hooks/use_fetch_log_patterns';
import { getScreenContext } from '../../../../hooks/use_screen_context';
import { useFetchAPMDependencies } from '../../../../hooks/use_fetch_apm_dependencies';
import { useFetchEvents } from '../../../../hooks/use_fetch_events';

export interface InvestigationContextualInsight {
  key: string;
  description: string;
  data: unknown;
}

export function AssistantHypothesis({
  investigation,
  start,
  end,
}: {
  investigation: GetInvestigationResponse;
  start: string;
  end: string;
}) {
  const { alert } = useInvestigation();
  const {
    dependencies: {
      start: {
        observabilityAIAssistant: {
          ObservabilityAIAssistantContextualInsight,
          getContextualInsightMessages,
        },
      },
    },
  } = useKibana();
  const serviceName = alert?.['service.name'] ? `${alert?.['service.name']}` : undefined;
  const serviceEnvironment = alert?.['service.environment']
    ? `${alert?.['service.environment']}`
    : undefined;
  const hostName = alert?.['host.name'] ? `${alert?.['host.name']}` : undefined;
  const containerId = alert?.['container.id'] ? `${alert?.['container.id']}` : undefined;
  const { data: apmDependenciesData } = useFetchAPMDependencies({
    investigationId: investigation.id,
    serviceName,
    serviceEnvironment,
    start,
    end,
  });
  const { data: entitiesData } = useFetchEntities({
    investigationId: investigation.id,
    serviceName,
    serviceEnvironment,
    hostName,
    containerId,
  });
  const { data: logPatternsData } = useFetchLogPatterns({
    investigationId: investigation.id,
    sources:
      entitiesData?.entities.map((entity) => ({
        index: entity.sources.map((source) => source.dataStream).join(','),
        entity: entity.displayName,
        serviceName,
        serviceEnvironment,
        containerId,
        hostName,
        dependencies: apmDependenciesData?.content
          ?.map((dependency) => dependency['service.name'])
          .filter((service): service is string => !!service),
      })) ?? [],
    start,
    end,
  });

  const entityContent = getEntityContext(entitiesData?.entities || []);
  const logPatternContent = getLogPatternContext(logPatternsData?.logPatterns || []);
  const dependenciesContent = getDependenciesContext(
    apmDependenciesData?.content
      ?.map((dependency) => dependency['service.name'])
      .filter((service): service is string => !!service) ?? [],
    serviceName ?? ''
  );

  const { data: deploymentEvents } = useFetchEvents({
    rangeFrom: investigation
      ? new Date(investigation.params.timeRange.from).toISOString()
      : undefined,
    rangeTo: investigation
      ? new Date(investigation?.params.timeRange.to ?? '').toISOString()
      : undefined,
    filter: `{"annotation.type":"deployment"}`,
  });

  const getInvestigationContextMessages = useCallback(async () => {
    if (!getContextualInsightMessages || !alert || !investigation || !deploymentEvents) {
      return [];
    }

    const instructions = dedent(`
      ${
        getScreenContext({
          alertDetails: alert,
          investigation,
          deploymentEvents,
        }).screenDescription
      }
      
## Current task:
${logPatternContent}
      
## Additional information:
${entityContent}
${dependenciesContent}

## Additional requests:
I do not have the alert details or entity details in front of me. Always include the alert reason and the entity metrics in your response. 
The user already has the investigation details in front of them. Do not repeat the name of the investigation or why it was initiated.

## Formatting
The entity metrics should be listed in a table format.
When referencing the log patterns or services, please include the name of the log pattern or service in a code block.
   `);

    return getContextualInsightMessages({
      message: `I am investigating a failure in my system. I was made aware of the failure by an alert and I am trying to understand the root cause of the issue.`,
      instructions,
    });
  }, [
    alert,
    getContextualInsightMessages,
    entityContent,
    logPatternContent,
    investigation,
    dependenciesContent,
    deploymentEvents,
  ]);

  if (!ObservabilityAIAssistantContextualInsight) {
    return null;
  }

  return alert && entitiesData && logPatternsData ? (
    <ObservabilityAIAssistantContextualInsight
      title={i18n.translate(
        'xpack.investigateApp.assistantHypothesis.observabilityAIAssistantContextualInsight.helpMeInvestigateThisLabel',
        { defaultMessage: 'Help me investigate this failure' }
      )}
      messages={getInvestigationContextMessages}
    />
  ) : null;
}

const formatEntityMetrics = (entity: EntityWithSource): string => {
  const entityMetrics = entity.metrics
    ? Object.entries(entity.metrics)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ')
    : null;
  const entitySources = entity.sources.map((source) => source.dataStream).join(', ');
  return dedent(`
    Entity name: ${entity.displayName}
    Entity type: ${entity.type}
    Entity data streams: ${entitySources}
    ${entityMetrics ? `Entity metrics: ${entityMetrics}` : ''} 
  `);
};

const formatLogPatterns = (logPattern: LogPattern): string => {
  return dedent(`
    ### Log pattern: ${logPattern.terms}
    Change type: ${logPattern?.change?.type}; 
    Change time: ${logPattern?.change?.timestamp}; 
    Document count: ${logPattern?.documentCount};
    ${logPattern?.source ? `Entity: ${logPattern?.source}` : ''}
    ${logPattern?.sampleDocument ? `Sample log document: ${logPattern?.sampleDocument}` : ''}
    ${
      logPattern?.change?.correlationCoefficient
        ? `Change correlation coefficient: ${logPattern?.change?.correlationCoefficient};`
        : ''
    }
  `);
};

const getLogPatternContext = (logPatterns: EntityLogPatterns[]): string => {
  return logPatterns?.length
    ? dedent(`
  Below is a list of new long patterns I detected across the stack. Group related relevant patterns together. Exclude irrelevant patterns that do not indicate a problem, even if these patterns are rare. Pay special attention to patterns that indicate an error and surface these patterns to the top of the list. Include the full "message" field from the sample log document when useful.

  Can you correlate these patterns across the stack, explain the relationships and narrow down the root cause based on the evidence? Please include an evidence-based hypothesis for what's causing the outage and list the most critical patterns first.
        
  ${logPatterns
    .map((logPattern) => {
      return dedent(`
        ## Log Patterns for ${logPattern.index}:
        ${logPattern.impactingPatterns.map((pattern) => formatLogPatterns(pattern)).join('\n\n')};
      `);
    })
    .join('\n\n')}`)
    : '';
};

const getEntityContext = (entities: EntityWithSource[]): string => {
  const entityContext = entities?.length
    ? `
  Alerts can optionally be associated with entities. Entities can be services, hosts, containers, or other resources. Entities can have metrics associated with them. 

  When displaying the entity metrics, please convert the metrics to a human-readable format. For example, convert "logRate" to "Log Rate" and "errorRate" to "Error Rate".
  
  The alert that triggered this investigation is associated with the following entities: 
  
  ${entities
    .map((entity, index) => {
      return dedent(`
        ## Entity ${index + 1}:
        ${formatEntityMetrics(entity)}
      `);
    })
    .join('/n/n')}`
    : '';

  return entityContext;
};

const getDependenciesContext = (dependencies: string[], serviceName: string): string => {
  return dependencies?.length && serviceName
    ? dedent(`
  The ${serviceName} service has the following dependencies: ${dependencies.join(', ')}.
  `)
    : '';
};
