/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceClient } from '@kbn/inference-plugin/server/types';
import { mergeMap, Observable, of, switchMap, from, map, catchError } from 'rxjs';
import type { ObservabilityElasticsearchClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import type { DataViewsService } from '@kbn/data-views-plugin/server';
import { withoutOutputUpdateEvents } from '@kbn/inference-plugin/server';
import { OutputCompleteEvent } from '@kbn/inference-plugin/common/output';
import { keyBy, omit } from 'lodash';
import { Logger } from '@kbn/logging';
import { getSampleDocuments } from '../../lib/get_sample_documents';
import { mergeSampleDocumentsWithFieldCaps } from '../../util/merge_sample_documents_with_field_caps';
import { EXTRACT_SERVICES_SYSTEM_MESSAGE } from '../../lib/tasks/extract_services/system_message';
import { sortAndTruncateAnalyzedFields } from '../../../common/utils/sort_and_truncate_analyzed_fields';
import { CoverageType, getFieldCoverage } from './get_field_coverage';

export type ExtractServiceDefinitionOutputCompleteEvent = OutputCompleteEvent<
  'get_service_definition_for_dataset',
  {
    candidates: Array<{
      field: string;
      terms: string[];
      coverageType: CoverageType;
    }>;
    analysis: { fields: string[]; total: number; sampled: number };
    dataset: string;
  }
>;

export function extractServiceDefinitions({
  inferenceClient,
  esClient,
  dataViewsService,
  datasets,
  connectorId,
  start,
  end,
  logger,
}: {
  inferenceClient: InferenceClient;
  esClient: ObservabilityElasticsearchClient;
  dataViewsService: DataViewsService;
  datasets: string[];
  connectorId: string;
  start: number;
  end: number;
  logger: Logger;
}): Observable<ExtractServiceDefinitionOutputCompleteEvent> {
  return of(...datasets).pipe(
    mergeMap((dataset) => {
      return from(
        Promise.all([
          getSampleDocuments({
            count: 500,
            start,
            end,
            esClient,
            indexPatterns: [dataset],
          }),
          dataViewsService.getFieldsForWildcard({
            includeEmptyFields: false,
            includeUnmapped: true,
            pattern: dataset,
          }),
        ])
      ).pipe(
        switchMap(([{ samples, total }, fieldCaps]) => {
          if (total === 0 || samples.length === 0) {
            return of();
          }
          const documentAnalysis = mergeSampleDocumentsWithFieldCaps({
            samples,
            fieldCaps,
            total,
          });

          const truncated = sortAndTruncateAnalyzedFields(documentAnalysis);

          return inferenceClient
            .output('identify_service_definition_fields', {
              connectorId,
              system: EXTRACT_SERVICES_SYSTEM_MESSAGE,
              input: `Your current task is to identify fields that could
              possibly identify a service. These fields will then be analyzed
              for coverage (how many % of the documents in the index have them),
              which you can then use in the next step to propose service
              definitions. We have sampled a set of documents for this
              dataset, and for each field collected some sample values. Based
              on the fields and their sample values, consider what field, in
              this dataset, could uniquely identify a service.
            
              # Dataset
      
              The current dataset is ${dataset}. The total number of documents
              in the index is ${total}, and ${samples.length} documents were
              sampled.
      
              ## Field statistics
    
            ${JSON.stringify(truncated)}
            `,
              schema: {
                type: 'object',
                properties: {
                  fields: {
                    type: 'array',
                    items: {
                      type: 'string',
                    },
                  },
                },
                required: ['fields'],
              } as const,
            })
            .pipe(
              withoutOutputUpdateEvents(),
              map((event) => {
                return {
                  ...event,
                  output: {
                    ...event.output,
                    dataset,
                    total,
                    analysis: truncated,
                    samples,
                  },
                };
              }),
              catchError((error) => {
                logger.error(error);
                return of();
              })
            );
        }),
        switchMap((event) => {
          return from(
            Promise.all(
              event.output.fields.map((field) =>
                getFieldCoverage({
                  field,
                  dataset,
                  start,
                  end,
                  esClient,
                })
              )
            ).then((coverage) => {
              return {
                ...event,
                output: {
                  ...event.output,
                  coverage,
                },
              };
            })
          );
        }),
        switchMap((event) => {
          return inferenceClient
            .output('get_service_definition_for_dataset', {
              connectorId,
              system: EXTRACT_SERVICES_SYSTEM_MESSAGE,
              input: `Your current task is to propose service definitions for
            the current dataset. You're previously selected a set of fields
            that could uniquely identify a service within this dataset. Propose
            service candidates. Start with the best candidate first if multiple
            candidates seem reasonable.
          
            # Dataset
    
            The current dataset is ${dataset}. The total number of documents
            in the index is ${event.output.total}, and ${event.output.samples.length}
            documents were sampled.
    
            ## Fields

            These fields were analyzed. There are several coverage types:
            - "none": no documents in this dataset have the specified field.
            - "empty": there are no documents at all in this dataset.
            - "partial": some or most, but not all documents in the dataset
              have this field set
            - "full": all documents in the dataset have this field set.

            \`\`\`
            ${JSON.stringify(event.output.coverage)}
            \`\`\`


          `,
              schema: {
                type: 'object',
                properties: {
                  fields: {
                    type: 'array',
                    items: {
                      type: 'string',
                    },
                  },
                },
                required: ['fields'],
              } as const,
            })
            .pipe(
              withoutOutputUpdateEvents(),
              map((serviceDefinitionEvent) => {
                const { analysis, coverage } = event.output;

                const coveragesByFieldName = keyBy(
                  coverage,
                  (fieldCoverage) => fieldCoverage.field
                );

                const candidates = serviceDefinitionEvent.output.fields.map((field) => {
                  const fieldCoverage = coveragesByFieldName[field];
                  return {
                    field,
                    terms: fieldCoverage?.terms ?? [],
                    coverageType: fieldCoverage?.coverage.type,
                  };
                });

                const droppedCandidates = omit(
                  coveragesByFieldName,
                  serviceDefinitionEvent.output.fields
                );

                return {
                  ...serviceDefinitionEvent,
                  output: {
                    ...serviceDefinitionEvent.output,
                    dataset,
                    analysis,
                    candidates,
                    droppedCandidates,
                  },
                };
              }),
              catchError((error) => {
                logger.error(error);
                return of();
              })
            );
        })
      );
    }, 5)
  );
}
