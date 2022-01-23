/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getInputIndex } from '../get_input_output_index';
import { ThreatMatchExecutorOptions } from '../types';
import { createThreatSignals } from '../threat_mapping/create_threat_signals';
import { withSecuritySpan } from '../../../../utils/with_security_span';

export const threatMatchExecutor = async ({
  completeRule,
  tuple,
  listClient,
  exceptionItems,
  services,
  version,
  searchAfterSize,
  logger,
  eventsTelemetry,
  experimentalFeatures,
  buildRuleMessage,
  bulkCreate,
  wrapHits,
}: ThreatMatchExecutorOptions) => {
  const ruleParams = completeRule.ruleParams;

  return withSecuritySpan('threatMatchExecutor', async () => {
    const inputIndex = await getInputIndex({
      experimentalFeatures,
      services,
      version,
      index: ruleParams.index,
    });

    return createThreatSignals({
      alertId: completeRule.alertId,
      buildRuleMessage,
      bulkCreate,
      completeRule,
      concurrentSearches: ruleParams.concurrentSearches ?? 1,
      eventsTelemetry,
      exceptionItems,
      filters: ruleParams.filters ?? [],
      inputIndex,
      itemsPerSearch: ruleParams.itemsPerSearch ?? 9000,
      language: ruleParams.language,
      listClient,
      logger,
      outputIndex: ruleParams.outputIndex,
      query: ruleParams.query,
      savedId: ruleParams.savedId,
      searchAfterSize,
      services,
      threatFilters: ruleParams.threatFilters ?? [],
      threatIndex: ruleParams.threatIndex,
      threatIndicatorPath: ruleParams.threatIndicatorPath,
      threatLanguage: ruleParams.threatLanguage,
      threatMapping: ruleParams.threatMapping,
      threatQuery: ruleParams.threatQuery,
      tuple,
      type: ruleParams.type,
      wrapHits,
    });
  });
};
