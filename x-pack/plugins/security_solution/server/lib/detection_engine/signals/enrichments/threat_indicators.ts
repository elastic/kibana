/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ThreatIndex } from '@kbn/securitysolution-io-ts-alerting-types';

import { OpenPointInTimeResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Logger } from '@kbn/core/server';
import {
  AlertInstanceContext,
  AlertInstanceState,
  RuleExecutorServices,
} from '@kbn/alerting-plugin/server';
import { ListClient } from '@kbn/lists-plugin/server';
import type { SignalSourceHit } from '../types';
import { buildThreatMappingFilter } from '../threat_mapping/build_threat_mapping_filter';
import { getAllThreatListHits } from '../threat_mapping/get_threat_list';
import {
  enrichSignalThreatMatches,
  getSignalMatchesFromThreatList,
} from '../threat_mapping/enrich_signal_threat_matches';
import {
  THREAT_PIT_KEEP_ALIVE,
  EVENT_ENRICHMENT_INDICATOR_FIELD_MAP,
} from '../../../../../common/cti/constants';
import { BuildRuleMessage } from '../rule_messages';
import { validEventFields } from '../../../../../common/search_strategy/security_solution/cti';

export const createThreatEnrichments = async ({
  threatIndex,
  services,
  logger,
  buildRuleMessage,
  threatIndicatorPath,
  events,
  listClient,
}: {
  threatIndex: ThreatIndex;
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  logger: Logger;
  buildRuleMessage: BuildRuleMessage;
  threatIndicatorPath: string;
  events: SignalSourceHit[];
  listClient: ListClient;
}) => {
  let threatPitId: OpenPointInTimeResponse['id'] = (
    await services.scopedClusterClient.asCurrentUser.openPointInTime({
      index: threatIndex,
      keep_alive: THREAT_PIT_KEEP_ALIVE,
    })
  ).id;
  const reassignThreatPitId = (newPitId: OpenPointInTimeResponse['id'] | undefined) => {
    if (newPitId) threatPitId = newPitId;
  };

  if (events.length > 0) {
    const threatFilter = buildThreatMappingFilter({
      threatMapping: validEventFields.map((field) => ({
        entries: [
          {
            field,
            type: 'mapping',
            value: EVENT_ENRICHMENT_INDICATOR_FIELD_MAP[field],
          },
        ],
      })),
      threatList: events,
      entryKey: 'field',
    });

    const threatListHits = await getAllThreatListHits({
      esClient: services.scopedClusterClient.asCurrentUser,
      exceptionItems: [],
      threatFilters: [threatFilter],
      query: '*:*',
      language: 'kuery',
      index: threatIndex,
      logger,
      buildRuleMessage,
      threatListConfig: {
        _source: [threatIndicatorPath, 'threat.feed.*'],
        fields: undefined,
      },
      pitId: threatPitId,
      reassignPitId: reassignThreatPitId,
      runtimeMappings: undefined,
      listClient,
    });

    const signalMatches = getSignalMatchesFromThreatList(threatListHits);

    logger.debug(`---- threats -----`);
    logger.debug(`---- threatIndex ----- ${threatIndex} `);
    logger.debug(`---- threatFilter ----- ${JSON.stringify(threatFilter)} `);
    // logger.debug(`---- threatListHits ----- ${JSON.stringify(threatListHits)} `);
    logger.debug(`---- threatListHits ----- ${threatListHits.length} `);
    logger.debug(`---- threats -----`);

    return enrichSignalThreatMatches(
      events,
      () => Promise.resolve(threatListHits),
      `threat.indicator`,
      signalMatches
    );
  }
};
