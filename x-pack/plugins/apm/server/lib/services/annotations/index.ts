/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { APICaller } from 'kibana/server';
import { ScopedAnnotationsClient } from '../../../../../observability/server';
import { getDerivedServiceAnnotations } from './get_derived_service_annotations';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import { getStoredAnnotations } from './get_stored_annotations';

export async function getServiceAnnotations({
  setup,
  serviceName,
  environment,
  annotationsClient,
  apiCaller,
}: {
  serviceName: string;
  environment?: string;
  setup: Setup & SetupTimeRange;
  annotationsClient?: ScopedAnnotationsClient;
  apiCaller: APICaller;
}) {
  // start fetching derived annotations (based on transactions), but don't wait on it
  // it will likely be significantly slower than the stored annotations
  const derivedAnnotationsPromise = getDerivedServiceAnnotations({
    setup,
    serviceName,
    environment,
  });

  const storedAnnotations = annotationsClient
    ? await getStoredAnnotations({
        setup,
        serviceName,
        environment,
        annotationsClient,
        apiCaller,
      })
    : [];

  if (storedAnnotations.length) {
    derivedAnnotationsPromise.catch((error) => {
      // handle error silently to prevent Kibana from crashing
    });
    return { annotations: storedAnnotations };
  }

  return {
    annotations: await derivedAnnotationsPromise,
  };
}
