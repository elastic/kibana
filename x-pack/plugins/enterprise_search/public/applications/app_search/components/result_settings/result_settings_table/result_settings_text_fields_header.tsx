/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiTableHeader, EuiTableHeaderCell, EuiToolTip, EuiIcon } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

export const ResultSettingsTextFieldsHeader: React.FC = () => {
  return (
    <>
      <EuiTableHeader className="resultSettingsTable__columnLabels">
        <EuiTableHeaderCell align="left" />
        <EuiTableHeaderCell align="center" colSpan={2}>
          {i18n.translate('xpack.enterpriseSearch.appSearch.engine.resultSettings.table.rawTitle', {
            defaultMessage: 'Raw',
          })}
          <EuiToolTip
            position="top"
            content={i18n.translate(
              'xpack.enterpriseSearch.appSearch.engine.resultSettings.table.rawDescription',
              {
                defaultMessage:
                  'A raw field is an exact representation of a field value. Must be at least 20 characters. Defaults to the entire field.',
              }
            )}
          >
            <EuiIcon type="questionInCircle" />
          </EuiToolTip>
        </EuiTableHeaderCell>
        <EuiTableHeaderCell align="center" colSpan={3}>
          {i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.resultSettings.table.highlightingTitle',
            {
              defaultMessage: 'Highlighting',
            }
          )}
          <EuiToolTip
            position="top"
            content={i18n.translate(
              'xpack.enterpriseSearch.appSearch.engine.resultSettings.table.highlightingDescription',
              {
                defaultMessage:
                  'A snippet is an escaped representaiton of a field value. Query matches are encapsulated in <em> tags for highlighting. Fallback will look for a snippet match, but fallback to an escaped raw value if none is found. Range is between 20-1000. Defaults to 100.',
              }
            )}
          >
            <EuiIcon type="questionInCircle" />
          </EuiToolTip>
        </EuiTableHeaderCell>
      </EuiTableHeader>
      <EuiTableHeader className="resultSettingsTable__textHeader">
        <EuiTableHeaderCell align="left">
          {i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.resultSettings.table.column.textFieldsTitle',
            { defaultMessage: 'Text fields' }
          )}
        </EuiTableHeaderCell>
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
      </EuiTableHeader>
    </>
  );
};
