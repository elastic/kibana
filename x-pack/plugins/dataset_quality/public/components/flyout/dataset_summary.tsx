/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { ES_FIELD_TYPES, KBN_FIELD_TYPES } from '@kbn/field-types';
import {
  flyoutDatasetDetailsText,
  flyoutDatasetLastActivityText,
  flyoutDatasetTypeText,
} from '../../../common/translations';
import { DataStreamStat } from '../../../common/data_streams_stats/data_stream_stat';

interface DatasetSummaryProps {
  fieldFormats: FieldFormatsStart;
  dataStreamStat: DataStreamStat;
}

export function DatasetSummary({ dataStreamStat, fieldFormats }: DatasetSummaryProps) {
  const [type, _dataset, namespace] = dataStreamStat.name.split('-');
  const formattedLastActivity = fieldFormats
    .getDefaultInstance(KBN_FIELD_TYPES.DATE, [ES_FIELD_TYPES.DATE])
    .convert(dataStreamStat.lastActivity);

  return (
    <EuiPanel hasBorder grow={false}>
      <EuiTitle size="s">
        <span>{flyoutDatasetDetailsText}</span>
      </EuiTitle>
      <EuiSpacer />
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexGroup>
          <EuiFlexItem grow={1}>
            <EuiTitle size="xxs">
              <span>{flyoutDatasetTypeText}</span>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={4}>{type}</EuiFlexItem>
        </EuiFlexGroup>
        <EuiHorizontalRule margin="s" />
        <EuiFlexGroup>
          <EuiFlexItem grow={1}>
            <EuiTitle size="xxs">
              <span>Namespace</span>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={4}>
            <EuiBadge
              color="hollow"
              css={css`
                width: fit-content;
              `}
            >
              {namespace}
            </EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiHorizontalRule margin="s" />
        <EuiFlexGroup>
          <EuiFlexItem grow={1}>
            <EuiTitle size="xxs">
              <span>{flyoutDatasetLastActivityText}</span>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={4}>{formattedLastActivity}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
