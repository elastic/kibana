/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { ScopedAnnotationsClient } from '@kbn/observability-plugin/server';
import { getDerivedServiceAnnotations } from './get_derived_service_annotations';
import { Setup } from '../../../lib/helpers/setup_request';
import { getStoredAnnotations } from './get_stored_annotations';

export async function getServiceAnnotations({
  setup,
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
  setup: Setup;
  searchAggregatedTransactions: boolean;
  annotationsClient?: ScopedAnnotationsClient;
  client: ElasticsearchClient;
  logger: Logger;
  start: number;
  end: number;
}) {
  // start fetching derived annotations (based on transactions), but don't wait on it
  // it will likely be significantly slower than the stored annotations
  const derivedAnnotationsPromise = getDerivedServiceAnnotations({
    setup,
    serviceName,
    environment,
    searchAggregatedTransactions,
    start,
    end,
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
    derivedAnnotationsPromise.catch(() => {
      // handle error silently to prevent Kibana from crashing
    });
    return { annotations: storedAnnotations };
  }

  return {
    annotations: await derivedAnnotationsPromise,
  };
}
