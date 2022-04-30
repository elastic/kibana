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
    engine: {
      adaptive_relevance_suggestions: adaptiveRelevanceSuggestions,
      adaptive_relevance_suggestions_active: adaptiveRelevanceSuggestionsActive,
    },
  } = useValues(EngineLogic);

  const pendingCount = adaptiveRelevanceSuggestions?.curation.pending;

  if (
    typeof adaptiveRelevanceSuggestions === 'undefined' ||
    pendingCount === 0 ||
    adaptiveRelevanceSuggestionsActive === false
  ) {
    return null;
  }

  return (
    <SuggestionsCallout
      style={{ marginBottom: '24px' }}
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
      lastUpdatedTimestamp={adaptiveRelevanceSuggestions.curation.last_updated}
    />
  );
};
