/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import dedent from 'dedent';
import {
  ALERT_RULE_PARAMETERS,
  ALERT_START,
  ALERT_RULE_CATEGORY,
  ALERT_REASON,
} from '@kbn/rule-data-utils';
import { i18n } from '@kbn/i18n';
import { EntityWithSource } from '@kbn/investigation-shared';
import React, { useCallback } from 'react';
import { useKibana } from '../../../../hooks/use_kibana';
import { useInvestigation } from '../../contexts/investigation_context';
import { useFetchEntities } from '../../../../hooks/use_fetch_entities';

export interface InvestigationContextualInsight {
  key: string;
  description: string;
  data: unknown;
}

export function AssistantHypothesis({ investigationId }: { investigationId: string }) {
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
  const { data: entitiesData } = useFetchEntities({
    investigationId,
    serviceName: alert?.['service.name'] ? `${alert?.['service.name']}` : undefined,
    serviceEnvironment: alert?.['service.environment']
      ? `${alert?.['service.environment']}`
      : undefined,
    hostName: alert?.['host.name'] ? `${alert?.['host.name']}` : undefined,
    containerId: alert?.['container.id'] ? `${alert?.['container.id']}` : undefined,
  });

  const getAlertContextMessages = useCallback(async () => {
    if (!getContextualInsightMessages || !alert) {
      return [];
    }

    const entities = entitiesData?.entities ?? [];

    const entityContext = entities?.length
      ? `
      Alerts can optionally be associated with entities. Entities can be services, hosts, containers, or other resources. Entities can have metrics associated with them. 
      
      The alert that triggered this investigation is associated with the following entities: ${entities
        .map((entity, index) => {
          return dedent(`
            ## Entity ${index + 1}:
            ${formatEntityMetrics(entity)};
          `);
        })
        .join('/n/n')}`
      : '';

    return getContextualInsightMessages({
      message: `I am investigating a failure in my system. I was made aware of the failure by an alert and I am trying to understand the root cause of the issue.`,
      instructions: dedent(
        `I'm an SRE. I am investigating a failure in my system. I was made aware of the failure via an alert. Your current task is to help me identify the root cause of the failure in my system.

        The rule that triggered the alert is a ${
          alert[ALERT_RULE_CATEGORY]
        } rule. The alert started at ${alert[ALERT_START]}. The alert reason is ${
          alert[ALERT_REASON]
        }. The rule parameters are ${JSON.stringify(ALERT_RULE_PARAMETERS)}.

        ${entityContext}

        Based on the alert details, suggest a root cause and next steps to mitigate the issue. 
        
        I do not have the alert details or entity details in front of me, so be sure to repeat the alert reason (${
          alert[ALERT_REASON]
        }), when the alert was triggered (${
          alert[ALERT_START]
        }), and the entity metrics in your response.

        When displaying the entity metrics, please convert the metrics to a human-readable format. For example, convert "logRate" to "Log Rate" and "errorRate" to "Error Rate".
        `
      ),
    });
  }, [alert, getContextualInsightMessages, entitiesData?.entities]);

  if (!ObservabilityAIAssistantContextualInsight) {
    return null;
  }

  return alert && entitiesData ? (
    <ObservabilityAIAssistantContextualInsight
      title={i18n.translate(
        'xpack.investigateApp.assistantHypothesis.observabilityAIAssistantContextualInsight.helpMeInvestigateThisLabel',
        { defaultMessage: 'Help me investigate this failure' }
      )}
      messages={getAlertContextMessages}
    />
  ) : null;
}
const formatEntityMetrics = (entity: EntityWithSource): string => {
  const entityMetrics = Object.entries(entity.metrics)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');
  const entitySources = entity.sources.map((source) => source.dataStream).join(', ');
  return dedent(`
    Entity name: ${entity.display_name}; 
    Entity type: ${entity.type}; 
    Entity metrics: ${entityMetrics}; 
    Entity data streams: ${entitySources}
  `);
};
