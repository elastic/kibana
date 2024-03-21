/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { Logger } from '@kbn/core/server';
import { SLO_SUMMARY_DESTINATION_INDEX_PATTERN } from '../../common/constants';
import { Duration, SLO } from '../domain/models';
import { computeBurnRate, computeSLI } from '../domain/services';
import { DefaultSLIClient } from './sli_client';
import { KibanaSavedObjectsSLORepository } from './slo_repository';
import { EsSummaryDocument } from './summary_transform_generator/helpers/create_temp_summary';
import { fromSummaryDocumentToSlo } from './unsafe_federated/helper';

interface Services {
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  logger: Logger;
}

interface LookbackWindow {
  name: string;
  duration: Duration;
}

export async function getBurnRates({
  sloId,
  windows,
  instanceId,
  remoteName,
  services,
}: {
  sloId: string;
  instanceId: string;
  remoteName?: string;
  windows: LookbackWindow[];
  services: Services;
}) {
  const { soClient, esClient, logger } = services;

  const repository = new KibanaSavedObjectsSLORepository(soClient, logger);
  const sliClient = new DefaultSLIClient(esClient);

  let slo: SLO | undefined;
  if (remoteName) {
    const summarySearch = await esClient.search<EsSummaryDocument>({
      index: `${remoteName}:${SLO_SUMMARY_DESTINATION_INDEX_PATTERN}`,
      query: {
        bool: {
          filter: [
            { term: { spaceId: 'default' } },
            { term: { 'slo.id': sloId } },
            { term: { 'slo.instanceId': instanceId } },
          ],
        },
      },
    });

    if (summarySearch.hits.hits.length === 0) {
      throw new Error('SLO not found');
    }

    slo = fromSummaryDocumentToSlo(summarySearch.hits.hits[0]._source!, services.logger);
  } else {
    slo = await repository.findById(sloId);
  }

  const sliData = await sliClient.fetchSLIDataFrom(slo!, instanceId, windows, remoteName);
  return Object.keys(sliData).map((key) => {
    return {
      name: key,
      burnRate: computeBurnRate(slo!, sliData[key]),
      sli: computeSLI(sliData[key].good, sliData[key].total),
    };
  });
}
