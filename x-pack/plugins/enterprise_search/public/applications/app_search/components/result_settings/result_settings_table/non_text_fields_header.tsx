/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiTableRow, EuiTableHeaderCell } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const NonTextFieldsHeader: React.FC = () => {
  return (
    <EuiTableRow>
      <EuiTableHeaderCell align="left">
        {i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.resultSettings.table.column.nonTextFieldsTitle',
          { defaultMessage: 'Non-text fields' }
        )}
      </EuiTableHeaderCell>
      <EuiTableHeaderCell align="center">
        {i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.resultSettings.table.column.rawTitle',
          { defaultMessage: 'Raw' }
        )}
      </EuiTableHeaderCell>
      <EuiTableHeaderCell colSpan={4} aria-hidden />
    </EuiTableRow>
  );
};
