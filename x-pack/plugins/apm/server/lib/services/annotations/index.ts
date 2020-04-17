/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SERVICE_NAME } from '../../../../common/elasticsearch_fieldnames';
import { ScopedAnnotationsClient } from '../../../../../observability/server';
import { getDerivedServiceAnnotations } from './get_derived_service_annotations';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import { Annotation, AnnotationType } from '../../../../common/annotations';

export async function getServiceAnnotations({
  setup,
  serviceName,
  environment,
  annotationsClient
}: {
  serviceName: string;
  environment?: string;
  setup: Setup & SetupTimeRange;
  annotationsClient?: ScopedAnnotationsClient;
}) {
  async function getStoredAnnotations(): Promise<Annotation[]> {
    if (!annotationsClient) {
      return [];
    }

    const response = await annotationsClient.search({
      start: setup.start,
      end: setup.end,
      annotation: {
        type: 'deployment'
      },
      tags: ['apm'],
      filter: {
        term: {
          [SERVICE_NAME]: serviceName
        }
      }
    });

    return response.hits.hits.map(hit => {
      return {
        type: AnnotationType.VERSION,
        id: hit._id,
        time: new Date(hit._source['@timestamp']).getTime(),
        text: hit._source.message
      };
    });
  }

  const [derivedAnnotations, storedAnnotations] = await Promise.all([
    getDerivedServiceAnnotations({
      setup,
      serviceName,
      environment
    }),
    getStoredAnnotations()
  ]);

  if (storedAnnotations.length) {
    return { annotations: storedAnnotations };
  }

  return {
    annotations: derivedAnnotations
  };
}
