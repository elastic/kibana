/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import type { FieldDataRowProps } from '../../types/field_data_row';
import { TopValues } from '../../../index_based/components/field_data_row/top_values';
import { ExpandedRowFieldHeader } from '../expanded_row_field_header';
import { DocumentStatsTable } from './document_stats';

export const KeywordContent: FC<FieldDataRowProps> = ({ config }) => {
  const { stats } = config;
  const fieldFormat = 'fieldFormat' in config ? config.fieldFormat : undefined;

  return (
    <EuiFlexGroup data-test-subj={'mlDVKeywordContent'} gutterSize={'xl'}>
      <DocumentStatsTable config={config} />

      <EuiFlexItem>
        <ExpandedRowFieldHeader>
          <FormattedMessage
            id="xpack.ml.fieldDataCard.cardKeyword.topValuesLabel"
            defaultMessage="Top values"
          />
        </ExpandedRowFieldHeader>
        <EuiSpacer size="xs" />
        <TopValues stats={stats} fieldFormat={fieldFormat} barColor="secondary" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
