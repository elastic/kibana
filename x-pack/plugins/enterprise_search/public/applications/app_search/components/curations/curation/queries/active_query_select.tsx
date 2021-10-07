/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import { EuiFormRow, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { CurationLogic } from '../curation_logic';

export const ActiveQuerySelect: React.FC = () => {
  const { setActiveQuery } = useActions(CurationLogic);
  const { queries, activeQuery, queriesLoading } = useValues(CurationLogic);

  return (
    <EuiFormRow
      label={i18n.translate('xpack.enterpriseSearch.appSearch.engine.curations.activeQueryLabel', {
        defaultMessage: 'Active query',
      })}
      helpText={i18n.translate(
        'xpack.enterpriseSearch.appSearch.engine.curations.activeQueryHelpText',
        {
          defaultMessage: 'Select a query to view the organic search results for them',
        }
      )}
      fullWidth
    >
      <EuiSelect
        options={queries.map((query) => ({
          value: query,
          text: query,
        }))}
        value={activeQuery}
        onChange={(e) => setActiveQuery(e.target.value)}
        isLoading={queriesLoading}
        fullWidth
      />
    </EuiFormRow>
  );
};
