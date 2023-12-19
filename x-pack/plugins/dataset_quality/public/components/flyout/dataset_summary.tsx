/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiBadge } from '@elastic/eui';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { ES_FIELD_TYPES, KBN_FIELD_TYPES } from '@kbn/field-types';
import {
  flyoutDatasetDetailsText,
  flyoutDatasetLastActivityText,
  flyoutDatasetNameSpaceText,
} from '../../../common/translations';
import { DataStreamStat } from '../../../common/data_streams_stats/data_stream_stat';
import { FieldsList } from './fields_list';

interface DatasetSummaryProps {
  fieldFormats: FieldFormatsStart;
  dataStreamStat: DataStreamStat;
}

export function DatasetSummary({ dataStreamStat, fieldFormats }: DatasetSummaryProps) {
  const formattedLastActivity = fieldFormats
    .getDefaultInstance(KBN_FIELD_TYPES.DATE, [ES_FIELD_TYPES.DATE])
    .convert(dataStreamStat.lastActivity);

  return (
    <FieldsList
      title={flyoutDatasetDetailsText}
      fields={[
        {
          fieldTitle: flyoutDatasetNameSpaceText,
          fieldValue: (
            <EuiBadge
              color="hollow"
              css={css`
                width: fit-content;
              `}
            >
              {dataStreamStat.namespace}
            </EuiBadge>
          ),
        },
        {
          fieldTitle: flyoutDatasetLastActivityText,
          fieldValue: formattedLastActivity,
        },
      ]}
    />
  );
}
