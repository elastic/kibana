/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProfilingSetupStep, ProfilingSetupStepFactoryOptions } from '../types';
import { catchResourceAlreadyExistsException } from './catch_resource_already_exists_exception';

function getEventDataStreamNames() {
  const subSampledIndicesIdx = Array.from(Array(11).keys(), (item: number) => item + 1);
  const subSampledIndexName = (pow: number): string => {
    return `profiling-events-5pow${String(pow).padStart(2, '0')}`;
  };
  // Generate all the possible index template names
  const eventsIndices = ['profiling-events-all'].concat(
    subSampledIndicesIdx.map((pow) => subSampledIndexName(pow))
  );

  return eventsIndices;
}

export function getCreateEventsDataStreamsStep({
  client,
  logger,
}: ProfilingSetupStepFactoryOptions): ProfilingSetupStep {
  const esClient = client.getEsClient();

  const dataStreamNames = getEventDataStreamNames();

  return {
    name: 'create_events_data_streams',
    hasCompleted: async () => {
      const dataStreams = await esClient.indices.getDataStream({
        name: 'profiling-events*',
      });

      const allDataStreams = dataStreams.data_streams.map((dataStream) => dataStream.name);

      const missingDataStreams = dataStreamNames.filter(
        (eventIndex) => !allDataStreams.includes(eventIndex)
      );

      if (missingDataStreams.length > 0) {
        logger.debug(`Missing event indices: ${missingDataStreams.join(', ')}`);
      }

      return missingDataStreams.length === 0;
    },
    init: async () => {
      await Promise.all(
        dataStreamNames.map((dataStreamName) =>
          esClient.indices
            .createDataStream({
              name: dataStreamName,
            })
            .catch(catchResourceAlreadyExistsException)
        )
      );
    },
  };
}
