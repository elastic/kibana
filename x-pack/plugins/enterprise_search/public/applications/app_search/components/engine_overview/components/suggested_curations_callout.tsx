/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { useValues } from 'kea';

import { i18n } from '@kbn/i18n';

import { ENGINE_CURATIONS_PATH } from '../../../routes';
import { SuggestionsCallout } from '../../curations/components/suggestions_callout';
import { EngineLogic, generateEnginePath } from '../../engine';

export const SuggestedCurationsCallout: React.FC = () => {
  const {
    engine: { search_relevance_suggestions: searchRelevanceSuggestions },
  } = useValues(EngineLogic);

  const pendingCount = searchRelevanceSuggestions?.curation.pending;

  if (typeof searchRelevanceSuggestions === 'undefined' || pendingCount === 0) {
    return null;
  }

  return (
    <SuggestionsCallout
      title={i18n.translate(
        'xpack.enterpriseSearch.appSearch.engine.suggestedCurationsCallout.title',
        { defaultMessage: 'New suggested curations to review' }
      )}
      description={i18n.translate(
        'xpack.enterpriseSearch.appSearch.engine.suggestedCurationsCallout.description',
        {
          defaultMessage:
            "Based on your engine's analytics, there are new suggested curations ready to review.",
        }
      )}
      buttonTo={generateEnginePath(ENGINE_CURATIONS_PATH)}
      lastUpdatedTimestamp={searchRelevanceSuggestions.curation.last_updated}
    />
  );
};
