/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';

import { BasicParametersSection, EditFieldFormRow } from '../edit_field';

export const RankFeatureType = () => {
  return (
    <BasicParametersSection>
      <EditFieldFormRow
        title={i18n.translate(
          'xpack.idxMgmt.mappingsEditor.rankFeature.positiveScoreImpactFieldTitle',
          {
            defaultMessage: 'Positive score impact',
          }
        )}
        description={i18n.translate(
          'xpack.idxMgmt.mappingsEditor.rankFeature.positiveScoreImpactFieldDescription',
          {
            defaultMessage:
              'Rank features that correlate negatively with the score should disable this field.',
          }
        )}
        formFieldPath="positive_score_impact"
      />
    </BasicParametersSection>
  );
};
