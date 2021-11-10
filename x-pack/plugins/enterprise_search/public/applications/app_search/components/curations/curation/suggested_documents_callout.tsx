/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { useValues } from 'kea';

import { i18n } from '@kbn/i18n';

import { ENGINE_CURATION_SUGGESTION_PATH } from '../../../routes';
import { EngineLogic, generateEnginePath } from '../../engine';

import { SuggestionsCallout } from '../components/suggestions_callout';

import { CurationLogic } from '.';

export const SuggestedDocumentsCallout: React.FC = () => {
  const {
    curation: { suggestion, queries },
  } = useValues(CurationLogic);
  const {
    engine: { adaptive_relevance_suggestions_active: adaptiveRelevanceSuggestionsActive },
  } = useValues(EngineLogic);

  if (
    typeof suggestion === 'undefined' ||
    suggestion.status !== 'pending' ||
    adaptiveRelevanceSuggestionsActive === false
  ) {
    return null;
  }

  return (
    <SuggestionsCallout
      style={{ marginTop: '24px' }}
      title={i18n.translate(
        'xpack.enterpriseSearch.appSearch.engine.curation.suggestedDocumentsCallout.title',
        { defaultMessage: 'New suggested documents for this query' }
      )}
      description={i18n.translate(
        'xpack.enterpriseSearch.appSearch.engine.curation.suggestedDocumentsCallout.description',
        {
          defaultMessage:
            "Based on your engine's analytics, there are new suggested document promotions ready to review.",
        }
      )}
      buttonTo={generateEnginePath(ENGINE_CURATION_SUGGESTION_PATH, {
        query: queries[0],
      })}
      lastUpdatedTimestamp={suggestion.updated_at}
    />
  );
};
