/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import type {
  EuiTableActionsColumnType,
  EuiTableComputedColumnType,
  EuiTableFieldDataColumnType,
} from '@elastic/eui';
import { EuiBadgeGroup, EuiBadge, EuiHealth, EuiToolTip, RIGHT_ALIGNMENT } from '@elastic/eui';
import { Status } from '@kbn/cases-components/src/status/status';

import { CaseSeverity } from '../../../common/types/domain';
import type { CaseUI } from '../../../common/ui/types';
import { getEmptyCellValue } from '../empty_value';
import { FormattedRelativePreferenceDate } from '../formatted_date';
import { CaseDetailsLink } from '../links';
import { TruncatedText } from '../truncated_text';
import { severities } from '../severity/config';
import { useCasesColumnsConfiguration } from '../all_cases/use_cases_columns_configuration';

type CasesColumns =
  | EuiTableActionsColumnType<CaseUI>
  | EuiTableComputedColumnType<CaseUI>
  | EuiTableFieldDataColumnType<CaseUI>;

const LINE_CLAMP = 3;
const getLineClampedCss = css`
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: ${LINE_CLAMP};
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: normal;
`;

const renderStringField = (field: string, dataTestSubj: string) =>
  field != null ? <span data-test-subj={dataTestSubj}>{field}</span> : getEmptyCellValue();

export interface UseCasesColumnsReturnValue {
  columns: CasesColumns[];
  rowHeader: string;
}

export const useSimilarCasesColumns = (): UseCasesColumnsReturnValue => {
  const casesColumnsConfig = useCasesColumnsConfiguration(false);
  const columns: CasesColumns[] = useMemo(
    () => [
      {
        field: casesColumnsConfig.title.field,
        name: casesColumnsConfig.title.name,
        sortable: true,
        render: (title: string, theCase: CaseUI) => {
          if (theCase.id != null && theCase.title != null) {
            const caseDetailsLinkComponent = (
              <CaseDetailsLink detailName={theCase.id} title={theCase.title}>
                <TruncatedText text={theCase.title} />
              </CaseDetailsLink>
            );

            return caseDetailsLinkComponent;
          }
          return getEmptyCellValue();
        },
        width: '20%',
      },
      {
        field: casesColumnsConfig.tags.field,
        name: casesColumnsConfig.tags.name,
        render: (tags: CaseUI['tags']) => {
          if (tags != null && tags.length > 0) {
            const clampedBadges = (
              <EuiBadgeGroup
                data-test-subj="case-table-column-tags"
                css={getLineClampedCss}
                gutterSize="xs"
              >
                {tags.map((tag: string, i: number) => (
                  <EuiBadge
                    css={css`
                      max-width: 100px;
                    `}
                    color="hollow"
                    key={`${tag}-${i}`}
                    data-test-subj={`case-table-column-tags-${tag}`}
                  >
                    {tag}
                  </EuiBadge>
                ))}
              </EuiBadgeGroup>
            );

            const unclampedBadges = (
              <EuiBadgeGroup data-test-subj="case-table-column-tags">
                {tags.map((tag: string, i: number) => (
                  <EuiBadge
                    color="hollow"
                    key={`${tag}-${i}`}
                    data-test-subj={`case-table-column-tags-${tag}`}
                  >
                    {tag}
                  </EuiBadge>
                ))}
              </EuiBadgeGroup>
            );

            return (
              <EuiToolTip
                data-test-subj="case-table-column-tags-tooltip"
                position="left"
                content={unclampedBadges}
              >
                {clampedBadges}
              </EuiToolTip>
            );
          }
          return getEmptyCellValue();
        },
        width: '12%',
      },
      {
        field: casesColumnsConfig.totalAlerts.field,
        name: casesColumnsConfig.totalAlerts.name,
        align: RIGHT_ALIGNMENT,
        render: (totalAlerts: CaseUI['totalAlerts']) =>
          totalAlerts != null
            ? renderStringField(`${totalAlerts}`, `case-table-column-alertsCount`)
            : getEmptyCellValue(),
        width: '80px',
      },
      {
        field: casesColumnsConfig.totalComment.field,
        name: casesColumnsConfig.totalComment.name,
        align: RIGHT_ALIGNMENT,
        render: (totalComment: CaseUI['totalComment']) =>
          totalComment != null
            ? renderStringField(`${totalComment}`, `case-table-column-commentCount`)
            : getEmptyCellValue(),
        width: '90px',
      },
      {
        field: casesColumnsConfig.category.field,
        name: casesColumnsConfig.category.name,
        sortable: true,
        render: (category: CaseUI['category']) => {
          if (category != null) {
            return (
              <span data-test-subj={`case-table-column-category-${category}`}>{category}</span>
            );
          }
          return getEmptyCellValue();
        },
        width: '120px',
      },
      {
        field: casesColumnsConfig.closedAt.field,
        name: casesColumnsConfig.closedAt.name,
        sortable: true,
        render: (closedAt: CaseUI['closedAt']) => {
          if (closedAt != null) {
            return (
              <span data-test-subj={`case-table-column-closedAt`}>
                <FormattedRelativePreferenceDate value={closedAt} />
              </span>
            );
          }
          return getEmptyCellValue();
        },
      },
      {
        field: casesColumnsConfig.createdAt.field,
        name: casesColumnsConfig.createdAt.name,
        sortable: true,
        render: (createdAt: CaseUI['createdAt']) => {
          if (createdAt != null) {
            return (
              <span data-test-subj={`case-table-column-createdAt`}>
                <FormattedRelativePreferenceDate value={createdAt} stripMs={true} />
              </span>
            );
          }
          return getEmptyCellValue();
        },
      },
      {
        field: casesColumnsConfig.updatedAt.field,
        name: casesColumnsConfig.updatedAt.name,
        sortable: true,
        render: (updatedAt: CaseUI['updatedAt']) => {
          if (updatedAt != null) {
            return (
              <span data-test-subj="case-table-column-updatedAt">
                <FormattedRelativePreferenceDate value={updatedAt} stripMs={true} />
              </span>
            );
          }
          return getEmptyCellValue();
        },
      },
      {
        field: casesColumnsConfig.status.field,
        name: casesColumnsConfig.status.name,
        sortable: true,
        render: (status: CaseUI['status']) => {
          if (status != null) {
            return <Status status={status} />;
          }

          return getEmptyCellValue();
        },
        width: '110px',
      },
      {
        field: casesColumnsConfig.severity.field,
        name: casesColumnsConfig.severity.name,
        sortable: true,
        render: (severity: CaseUI['severity']) => {
          if (severity != null) {
            const severityData = severities[severity ?? CaseSeverity.LOW];
            return (
              <EuiHealth
                data-test-subj={`case-table-column-severity-${severity}`}
                color={severityData.color}
              >
                {severityData.label}
              </EuiHealth>
            );
          }
          return getEmptyCellValue();
        },
        width: '90px',
      },
    ],
    [casesColumnsConfig]
  );

  return { columns, rowHeader: casesColumnsConfig.title.field };
};
