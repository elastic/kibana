/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiFieldSearch, EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { EngineLogic } from '../engine';
import { Result } from '../result/result';

import { RelevanceTuningLogic } from '.';

export const RelevanceTuningPreview: React.FC = () => {
  const { updateSearchValue } = useActions(RelevanceTuningLogic);
  const { searchResults } = useValues(RelevanceTuningLogic);
  const { engineName, isMetaEngine } = useValues(EngineLogic);

  return (
    <EuiPanel>
      <EuiTitle size="m">
        <h2>
          {i18n.translate('xpack.enterpriseSearch.appSearch.engine.relevanceTuning.preview.title', {
            defaultMessage: 'Preview',
          })}
        </h2>
      </EuiTitle>
      <EuiSpacer />
      <EuiFieldSearch
        onChange={(e) => updateSearchValue(e.target.value)}
        placeholder={i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.preview.texxtPlaceholder',
          {
            defaultMessage: 'Search {engineName}',
            values: {
              engineName,
            },
          }
        )}
        fullWidth
      />
      {searchResults &&
        searchResults.map((result) => {
          return (
            <React.Fragment key={result.id.raw}>
              <EuiSpacer size="m" />
              <Result result={result} showScore isMetaEngine={isMetaEngine} />
            </React.Fragment>
          );
        })}
    </EuiPanel>
  );
};
