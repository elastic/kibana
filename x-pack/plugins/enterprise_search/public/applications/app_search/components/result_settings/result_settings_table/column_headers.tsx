/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiIconTip, EuiTableHeader, EuiTableHeaderCell } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const ColumnHeaders: React.FC = () => {
  return (
    <EuiTableHeader className="resultSettingsTable__columnLabels">
      <EuiTableHeaderCell align="left" />
      <EuiTableHeaderCell align="center" colSpan={2}>
        {i18n.translate('xpack.enterpriseSearch.appSearch.engine.resultSettings.table.rawTitle', {
          defaultMessage: 'Raw',
        })}
        <EuiIconTip
          position="top"
          content={i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.resultSettings.table.rawTooltip',
            {
              defaultMessage:
                'A raw field is an exact representation of a field value. Must be at least 20 characters. Defaults to the entire field.',
            }
          )}
        />
      </EuiTableHeaderCell>
      <EuiTableHeaderCell align="center" colSpan={3}>
        {i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.resultSettings.table.highlightingTitle',
          {
            defaultMessage: 'Highlighting',
          }
        )}
        <EuiIconTip
          position="top"
          content={i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.resultSettings.table.highlightingTooltip',
            {
              defaultMessage:
                'A snippet is an escaped representaiton of a field value. Query matches are encapsulated in <em> tags for highlighting. Fallback will look for a snippet match, but fallback to an escaped raw value if none is found. Range is between 20-1000. Defaults to 100.',
              ignoreTag: true,
            }
          )}
        />
      </EuiTableHeaderCell>
    </EuiTableHeader>
  );
};
