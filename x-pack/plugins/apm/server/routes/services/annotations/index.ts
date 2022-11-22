/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { ScopedAnnotationsClient } from '@kbn/observability-plugin/server';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { getDerivedServiceAnnotations } from './get_derived_service_annotations';
import { getStoredAnnotations } from './get_stored_annotations';

export async function getServiceAnnotations({
  apmEventClient,
  searchAggregatedTransactions,
  serviceName,
  environment,
  annotationsClient,
  client,
  logger,
  start,
  end,
}: {
  serviceName: string;
  environment: string;
  apmEventClient: APMEventClient;
  searchAggregatedTransactions: boolean;
  annotationsClient?: ScopedAnnotationsClient;
  client: ElasticsearchClient;
  logger: Logger;
  start: number;
  end: number;
}) {
  // Variable to store any error happened on getDerivedServiceAnnotations other than RequestAborted
  let derivedAnnotationError: Error | undefined;

  // start fetching derived annotations (based on transactions), but don't wait on it
  // it will likely be significantly slower than the stored annotations
  const derivedAnnotationsPromise = getDerivedServiceAnnotations({
    apmEventClient,
    serviceName,
    environment,
    searchAggregatedTransactions,
    start,
    end,
  }).catch((error) => {
    // Save Error and wait for Stored annotations before re-throwing it
    derivedAnnotationError = error;
    return [];
  });

  const storedAnnotations = annotationsClient
    ? await getStoredAnnotations({
        serviceName,
        environment,
        annotationsClient,
        client,
        logger,
        start,
        end,
      })
    : [];

  if (storedAnnotations.length) {
    return { annotations: storedAnnotations };
  }

  // At this point storedAnnotations returned an empty array,
  // so if derivedAnnotationError is not undefined throws the error reported by getDerivedServiceAnnotations
  // and there's no reason to await the function anymore
  if (derivedAnnotationError) {
    throw derivedAnnotationError;
  }

  return {
    annotations: await derivedAnnotationsPromise,
  };
}
