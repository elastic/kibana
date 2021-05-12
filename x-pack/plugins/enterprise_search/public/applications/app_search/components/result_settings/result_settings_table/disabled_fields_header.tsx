/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiTableRow, EuiTableHeaderCell } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const DisabledFieldsHeader: React.FC = () => {
  return (
    <EuiTableRow>
      <EuiTableHeaderCell align="left" colSpan={5}>
        {i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.resultSettings.table.column.disabledFieldsTitle',
          { defaultMessage: 'Disabled fields' }
        )}
      </EuiTableHeaderCell>
    </EuiTableRow>
  );
};
