/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiSpacer } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

import type { FieldDataRowProps } from '../../../stats_datagrid/types/field_data_row';
import { TopValues } from '../../../index_based/components/field_data_row/top_values';
import { ExpandedRowFieldHeader } from '../expanded_row_field_header';

export const IpContent: FC<FieldDataRowProps> = ({ config }) => {
  const { stats } = config;
  if (stats === undefined) return null;
  const { count, sampleCount, cardinality } = stats;
  if (count === undefined || sampleCount === undefined || cardinality === undefined) return null;
  const fieldFormat = 'fieldFormat' in config ? config.fieldFormat : undefined;

  return (
    <div className="mlFieldDataCard__stats">
      <ExpandedRowFieldHeader>
        <FormattedMessage
          id="xpack.ml.fieldDataCard.cardIp.topValuesLabel"
          defaultMessage="Top values"
        />
      </ExpandedRowFieldHeader>
      <EuiSpacer size="xs" />
      <TopValues stats={stats} fieldFormat={fieldFormat} barColor="secondary" />
    </div>
  );
};
