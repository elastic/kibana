/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type AttackDiscovery,
  Replacements,
  replaceAnonymizedValuesWithOriginalValues,
} from '@kbn/elastic-assistant-common';

export const getDiscoveriesWithOriginalValues = ({
  attackDiscoveries,
  replacements,
}: {
  attackDiscoveries: AttackDiscovery[];
  replacements: Replacements;
}): AttackDiscovery[] =>
  attackDiscoveries.map((attackDiscovery) => ({
    ...attackDiscovery,
    detailsMarkdown: replaceAnonymizedValuesWithOriginalValues({
      messageContent: attackDiscovery.detailsMarkdown,
      replacements,
    }),
    entitySummaryMarkdown: replaceAnonymizedValuesWithOriginalValues({
      messageContent: attackDiscovery.entitySummaryMarkdown ?? '',
      replacements,
    }),
    summaryMarkdown: replaceAnonymizedValuesWithOriginalValues({
      messageContent: attackDiscovery.summaryMarkdown,
      replacements,
    }),
    title: replaceAnonymizedValuesWithOriginalValues({
      messageContent: attackDiscovery.title,
      replacements,
    }),
  }));
