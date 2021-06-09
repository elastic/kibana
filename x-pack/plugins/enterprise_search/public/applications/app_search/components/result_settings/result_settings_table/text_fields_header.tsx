/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiTableRow, EuiTableHeaderCell } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

export const TextFieldsHeader: React.FC = () => {
  return (
    <>
      <EuiTableRow className="resultSettingsTable__subHeader">
        <EuiTableHeaderCell align="left">
          {i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.resultSettings.table.column.textFieldsTitle',
            { defaultMessage: 'Text fields' }
          )}
        </EuiTableHeaderCell>
        {/* TODO Right now the stacked "Raw" ths leads screen readers to reading out Raw - Raw - Raw 3x in a row once you get down to the non-text fields. We should consider either:
          Channging this "Raw" column to something like "Enabled"
          Or losing the RAW vs HIGHLIGHTING top-level headings */}
        <EuiTableHeaderCell align="center">
          {i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.resultSettings.table.column.rawTitle',
            { defaultMessage: 'Raw' }
          )}
        </EuiTableHeaderCell>
        <EuiTableHeaderCell align="center">
          {i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.resultSettings.table.column.maxSizeTitle',
            { defaultMessage: 'Max size' }
          )}
        </EuiTableHeaderCell>
        <EuiTableHeaderCell align="center">
          {i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.resultSettings.table.column.snippetTitle',
            { defaultMessage: 'Snippet' }
          )}
        </EuiTableHeaderCell>
        <EuiTableHeaderCell align="center">
          {i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.resultSettings.table.column.fallbackTitle',
            { defaultMessage: 'Fallback' }
          )}
        </EuiTableHeaderCell>
        <EuiTableHeaderCell align="center">
          {i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.resultSettings.table.column.maxSizeTitle',
            { defaultMessage: 'Max size' }
          )}
        </EuiTableHeaderCell>
      </EuiTableRow>
    </>
  );
};
