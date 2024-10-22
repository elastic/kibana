/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiBasicTable, EuiBasicTableColumn, EuiText } from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { formatInteger } from '@kbn/observability-utils-common/format/integer';
import type { FieldPatternResultWithChanges } from '@kbn/observability-utils-server/entities/get_log_patterns';
import type { EntityHealthAnalysis } from '@kbn/observability-utils-server/llm/service_rca/analyze_entity_health';
import React, { useMemo } from 'react';
import { highlightPatternFromRegex } from '@kbn/observability-utils-common/llm/log_analysis/highlight_patterns_from_regex';
import { useTheme } from '../../../hooks/use_theme';

export function RootCauseAnalysisEntityLogPatternTable({
  ownPatternCategories,
  relevantPatternsFromOtherEntities,
}: Pick<
  EntityHealthAnalysis['attachments'],
  'ownPatternCategories' | 'relevantPatternsFromOtherEntities'
>) {
  const theme = useTheme();

  const columns = useMemo((): Array<EuiBasicTableColumn<FieldPatternResultWithChanges>> => {
    return [
      {
        field: 'change',
        name: '',
        render: (_, {}) => {
          return <></>;
        },
      },
      {
        field: 'pattern',
        name: i18n.translate(
          'xpack.observabilityAiAssistant.rca.logPatternTable.messageColumnTitle',
          { defaultMessage: 'Message' }
        ),
        render: (_, { pattern, regex, sample }) => {
          return (
            <EuiText
              size="xs"
              className={css`
                font-family: ${theme.font.familyCode};
                color: ${theme.colors.subduedText};
                em {
                  font-style: normal;
                  font-weight: ${theme.font.weight.semiBold};
                  color: ${theme.colors.primaryText};
                }
              `}
              dangerouslySetInnerHTML={{ __html: highlightPatternFromRegex(regex, sample) }}
            />
          );
        },
      },
      {
        field: 'count',
        name: i18n.translate(
          'xpack.observabilityAiAssistant.rca.logPatternTable.countColumnTitle',
          { defaultMessage: 'Count' }
        ),
        render: (_, { count }) => {
          return (
            <EuiText
              size="xs"
              className={css`
                white-space: nowrap;
              `}
            >
              {formatInteger(count)}
            </EuiText>
          );
        },
      },
    ];
  }, [theme]);

  const items = useMemo(() => {
    return [
      ...ownPatternCategories.flatMap(({ label, patterns }) => {
        return patterns;
      }),
    ];
  }, [ownPatternCategories, relevantPatternsFromOtherEntities]);

  return <EuiBasicTable tableLayout="auto" columns={columns} items={items} />;
}
