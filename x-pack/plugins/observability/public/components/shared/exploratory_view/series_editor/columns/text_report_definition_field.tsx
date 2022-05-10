/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SeriesConfig, SeriesUrl } from '../../types';

interface Props {
  seriesId: number;
  series: SeriesUrl;
  field: string;
  seriesConfig: SeriesConfig;
  onChange: (field: string, value: string) => void;
}

export function TextReportDefinitionField({ series, field, seriesConfig, onChange }: Props) {
  const { textReportDefinitions: selectedTextReportDefinitions = {} } = series;
  const { labels } = seriesConfig;
  const label = labels[field] ?? field;

  return (
    <EuiFormRow label={label}>
      <EuiFieldText
        placeholder={i18n.translate('xpack.observability.textDefinitionField.placeholder.search', {
          defaultMessage: 'Search {label}',
          values: { label },
        })}
        value={selectedTextReportDefinitions?.[field]}
        onChange={(e) => onChange(field, e.target.value)}
        compressed={false}
      />
    </EuiFormRow>
  );
}
