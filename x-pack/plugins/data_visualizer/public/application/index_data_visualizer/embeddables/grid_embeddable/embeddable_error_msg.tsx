/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiEmptyPrompt, EuiIcon, useEuiTheme, EuiFlexItem } from '@elastic/eui';
import { EmptyPlaceholder } from '@kbn/charts-plugin/public';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { FieldStatisticTableEmbeddableProps } from './types';
const FIELD_STATS_UNAVAILABLE_TITLE = i18n.translate(
  'xpack.dataVisualizer.fieldStats.unavailableTitle',
  {
    defaultMessage: 'Field statistics not supported for ES|QL queries',
  }
);

export const FieldStatsUnavailableMessage = ({
  id,
  content,
  title = FIELD_STATS_UNAVAILABLE_TITLE,
}: Pick<FieldStatisticTableEmbeddableProps, 'id'> & { content: string; title?: string }) => {
  const { euiTheme } = useEuiTheme();
  if (!content) return null;

  if (id === 'dashboard_embeddable') {
    return (
      <EuiFlexItem
        alignItems="center"
        fullWidth
        css={css`
          height: 100%;
        `}
      >
        <EmptyPlaceholder icon={'warning'} message={title} />
      </EuiFlexItem>
    );
  }
  return (
    <EuiEmptyPrompt
      icon={<EuiIcon size="l" type="warning" color="warning" />}
      color="plain"
      paddingSize="m"
      css={css`
        margin: ${euiTheme.size.xl} auto;
      `}
      title={<h2 data-test-subj="fieldStatsUnavailableCalloutTitle">{title}</h2>}
      titleSize="xs"
      hasBorder
      body={<>{content}</>}
    />
  );
};
