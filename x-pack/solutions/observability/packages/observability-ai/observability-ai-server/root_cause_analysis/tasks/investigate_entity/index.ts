/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEntityKuery } from '@kbn/observability-utils-common/entities/get_entity_kuery';
import { sortAndTruncateAnalyzedFields } from '@kbn/observability-utils-common/llm/log_analysis/sort_and_truncate_analyzed_fields';
import { analyzeDocuments } from '@kbn/observability-utils-server/entities/analyze_documents';
import { getDataStreamsForEntity } from '@kbn/observability-utils-server/entities/get_data_streams_for_entity';
import { getAlertsForEntity } from '@kbn/observability-utils-server/entities/signals/get_alerts_for_entity';
import { getSlosForEntity } from '@kbn/observability-utils-server/entities/signals/get_slos_for_entity';
import { TracedElasticsearchClient } from '@kbn/traced-es-client';
import { RootCauseAnalysisContext } from '../../types';
import { stringifySummaries } from '../../util/stringify_summaries';
import { analyzeLogPatterns } from '../analyze_log_patterns';
import { describeEntity } from '../describe_entity';
import { describeLogPatterns } from '../describe_log_patterns';
import { findRelatedEntities } from '../find_related_entities';
import { extractRelatedEntities } from '../find_related_entities/extract_related_entities';
import { writeEntityInvestigationReport } from '../write_entity_investigation_report';
import { EntityInvestigation } from './types';
import { getKnowledgeBaseEntries } from '../get_knowledge_base_entries';

export type { EntityInvestigation };

export interface EntityInvestigationParameters {
  entity: Record<string, string>;
  rcaContext: RootCauseAnalysisContext;
  context: string;
}

export async function investigateEntity(
  parameters: EntityInvestigationParameters
): Promise<EntityInvestigation | undefined> {
  const {
    entity,
    rcaContext,
    rcaContext: {
      inferenceClient,
      connectorId,
      start,
      end,
      esClient,
      logger: parentLogger,
      indices,
    },
    context,
  } = parameters;
  const kuery = getEntityKuery(entity);

  const logger = parentLogger.get('investigateEntity');

  logger.debug(() => `Investigating entity: ${JSON.stringify(parameters.entity)}`);

  const kbPromise = getKnowledgeBaseEntries({
    entity,
    context,
    rcaContext,
    maxTokens: 4_000,
  }).catch((error) => {
    logger.error(`Could not fetch entries from knowledge base`);
    logger.error(error);
    return [];
  });

  const [{ dataStreams }, alerts, slos] = await getSignals({ ...parameters, kuery });

  logger.debug(
    () =>
      `Signals for entity ${JSON.stringify(entity)}: ${dataStreams.length} data streams, ${
        alerts.length
      } alerts, ${slos.length} slos`
  );

  if (!dataStreams.length) {
    return undefined;
  }

  const fullAnalysis = await analyzeDataStreamsForEntity({
    start,
    end,
    esClient,
    kuery,
    dataStreams,
  });

  const truncatedAnalysis = sortAndTruncateAnalyzedFields(fullAnalysis);

  const kbEntries = await kbPromise;

  const { ownPatterns, patternsFromOtherEntities } = await analyzeLogPatterns({
    allAnalysis: [{ index: dataStreams, analysis: truncatedAnalysis }],
    entity,
    system: stringifySummaries(rcaContext),
    cutoff: {
      significance: 'high',
    },
    rcaContext,
    kbEntries,
  });

  logger.trace(
    () => `Analyzed log patterns: ${JSON.stringify({ ownPatterns, patternsFromOtherEntities })}`
  );

  const entityReportPromise = Promise.all([
    describeEntity({
      inferenceClient,
      analysis: truncatedAnalysis,
      connectorId,
      contextForEntityInvestigation: context,
      entity,
      ownPatterns,
      kbEntries,
    }),
    describeLogPatterns({
      analysis: truncatedAnalysis,
      connectorId,
      contextForEntityInvestigation: context,
      entity,
      inferenceClient,
      ownPatterns,
      patternsFromOtherEntities,
      kbEntries,
    }),
  ]).then(([entityDescription, logPatternDescription]) => {
    return writeEntityInvestigationReport({
      connectorId,
      inferenceClient,
      entityDescription,
      logPatternDescription,
      contextForEntityInvestigation: context,
      entity,
    }).then((report) => {
      return {
        description: entityDescription,
        logPatternDescription,
        report,
      };
    });
  });

  const [entityReport, relatedEntitiesResults] = await Promise.all([
    entityReportPromise,
    findRelatedEntities({
      connectorId,
      end,
      entity,
      esClient,
      index: indices.logs,
      inferenceClient,
      logger,
      start,
      context,
      analysis: {
        full: fullAnalysis,
        truncated: truncatedAnalysis,
      },
      ownPatterns,
      patternsFromOtherEntities,
      kbEntries,
    }).then(async ({ searches, summaries, foundEntities }) => {
      const report = await entityReportPromise;

      const { relatedEntities } = await extractRelatedEntities({
        entityReport: report.report,
        summaries,
        entity,
        foundEntities,
        context,
        rcaContext,
      });

      return {
        relatedEntities,
        foundEntities,
        searches,
        summaries,
      };
    }),
  ]);

  return {
    entity,
    summary: [
      entityReport.description,
      entityReport.logPatternDescription.content,
      entityReport.report,
    ].join('\n\n'),
    relatedEntities: relatedEntitiesResults.relatedEntities,
    attachments: {
      alerts,
      slos,
      analysis: truncatedAnalysis,
      ownPatterns,
      patternsFromOtherEntities,
      searches: relatedEntitiesResults.searches,
      relatedEntitiesSummaries: relatedEntitiesResults.summaries,
      kbEntries,
    },
  };
}

async function getSignals({
  entity,
  kuery,
  rcaContext: { start, end, esClient, rulesClient, alertsClient, indices, spaceId },
}: {
  kuery: string;
  entity: Record<string, unknown>;
  rcaContext: Pick<
    RootCauseAnalysisContext,
    'start' | 'end' | 'esClient' | 'rulesClient' | 'alertsClient' | 'indices' | 'spaceId'
  >;
}) {
  return await Promise.all([
    getDataStreamsForEntity({
      esClient,
      kuery,
      index: indices.logs.concat(indices.traces),
    }),
    getAlertsForEntity({ entity, rulesClient, alertsClient, start, end, size: 10 }).then(
      (alertsResponse) => {
        return alertsResponse.hits.hits.map((hit) => hit._source!);
      }
    ),
    getSlosForEntity({
      entity,
      start,
      end,
      esClient,
      size: 1000,
      sloSummaryIndices: indices.sloSummaries,
      spaceId,
    }).then((slosResponse) => {
      return slosResponse.hits.hits.map((hit) => hit._source);
    }),
  ]);
}

async function analyzeDataStreamsForEntity({
  start,
  end,
  dataStreams,
  esClient,
  kuery,
}: {
  start: number;
  end: number;
  kuery: string;
  dataStreams: string[];
  esClient: TracedElasticsearchClient;
}) {
  const analysis = await analyzeDocuments({
    esClient,
    start,
    end,
    index: dataStreams,
    kuery,
  });

  return {
    ...analysis,
    fields: analysis.fields.filter((field) => !field.empty),
  };
}
