/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { streamPartsToIndexPattern } from '../../../../common/utils';
import { DataStreamType } from '../../../../common/types';
import { dataStreamService, datasetQualityPrivileges } from '../../../services';

export async function getDataStreams(options: {
  esClient: ElasticsearchClient;
  type?: DataStreamType;
  datasetQuery?: string;
  uncategorisedOnly: boolean;
}) {
  const { esClient, type, datasetQuery, uncategorisedOnly } = options;

  const datasetName = streamPartsToIndexPattern({
    typePattern: type ?? '*',
    datasetPattern: datasetQuery ? `*${datasetQuery}*` : '*',
  });

  const datasetUserPrivileges = await datasetQualityPrivileges.getDatasetPrivileges(
    esClient,
    datasetName
  );

  if (!datasetUserPrivileges.canMonitor) {
    return {
      items: [],
      datasetUserPrivileges,
    };
  }

  const allDataStreams = await dataStreamService.getMatchingDataStreams(esClient, datasetName);

  const filteredDataStreams = uncategorisedOnly
    ? allDataStreams.filter((stream) => {
        return !stream._meta || !stream._meta.managed_by || stream._meta.managed_by !== 'fleet';
      })
    : allDataStreams;

  const dataStreamsPrivileges = filteredDataStreams.length
    ? await datasetQualityPrivileges.getHasIndexPrivileges(
        esClient,
        filteredDataStreams.map(({ name }) => name),
        ['monitor']
      )
    : {};

  const mappedDataStreams = filteredDataStreams.map((dataStream) => ({
    name: dataStream.name,
    integration: dataStream._meta?.package?.name,
    userPrivileges: {
      canMonitor: dataStreamsPrivileges[dataStream.name],
    },
  }));

  return {
    items: mappedDataStreams,
    datasetUserPrivileges,
  };
}
