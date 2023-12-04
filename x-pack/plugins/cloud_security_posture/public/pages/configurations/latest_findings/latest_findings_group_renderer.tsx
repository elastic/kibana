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
  EuiIconTip,
  EuiSkeletonTitle,
  EuiText,
  EuiTextBlockTruncate,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import {
  ECSField,
  GroupPanelRenderer,
  RawBucket,
  StatRenderer,
} from '@kbn/securitysolution-grouping/src';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { getAbbreviatedNumber } from '../../../common/utils/get_abbreviated_number';
import { CISBenchmarkIcon } from '../../../components/cis_benchmark_icon';
import { ComplianceScoreBar } from '../../../components/compliance_score_bar';
import { FindingsGroupingAggregation } from './use_grouped_findings';
import { GROUPING_OPTIONS, NULL_GROUPING_MESSAGES, NULL_GROUPING_UNIT } from './constants';
import { FINDINGS_GROUPING_COUNTER } from '../test_subjects';

/**
 * Return first non-null value. If the field contains an array, this will return the first value that isn't null. If the field isn't an array it'll be returned unless it's null.
 */
export function firstNonNullValue<T>(valueOrCollection: ECSField<T>): T | undefined {
  if (valueOrCollection === null) {
    return undefined;
  } else if (Array.isArray(valueOrCollection)) {
    for (const value of valueOrCollection) {
      if (value !== null) {
        return value;
      }
    }
  } else {
    return valueOrCollection;
  }
}

const NullGroupComponent = ({
  title,
  field,
  unit = NULL_GROUPING_UNIT,
}: {
  title: string;
  field: string;
  unit?: string;
}) => {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="xs">
      <strong>{title}</strong>
      <EuiIconTip
        anchorProps={{
          css: css`
            display: inline-flex;
          `,
        }}
        content={
          <>
            <FormattedMessage
              id="xpack.csp.findings.grouping.nullGroupTooltip"
              defaultMessage="The selected {groupingTitle} field, {field} is missing a value for this group of {unit}."
              values={{
                groupingTitle: (
                  <strong>
                    <FormattedMessage
                      id="xpack.csp.findings.grouping.nullGroupTooltip.groupingTitle"
                      defaultMessage="group by"
                    />
                  </strong>
                ),
                field: <code>{field}</code>,
                unit,
              }}
            />
          </>
        }
        position="right"
      />
    </EuiFlexGroup>
  );
};

export const groupPanelRenderer: GroupPanelRenderer<FindingsGroupingAggregation> = (
  selectedGroup,
  bucket,
  nullGroupMessage,
  isLoading
) => {
  if (isLoading) {
    return (
      <EuiSkeletonTitle size="s" isLoading={true}>
        <FormattedMessage
          id="xpack.csp.findings.grouping.loadingGroupPanelTitle"
          defaultMessage="Loading"
        />
      </EuiSkeletonTitle>
    );
  }
  const benchmarkId = firstNonNullValue(bucket.benchmarkId?.buckets?.[0]?.key);
  switch (selectedGroup) {
    case GROUPING_OPTIONS.RESOURCE_NAME:
      return nullGroupMessage ? (
        <NullGroupComponent title={NULL_GROUPING_MESSAGES.RESOURCE_NAME} field={selectedGroup} />
      ) : (
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="none">
              <EuiFlexItem
                css={css`
                  display: inline;
                `}
              >
                <EuiText size="s">
                  <EuiTextBlockTruncate
                    lines={2}
                    css={css`
                      word-break: break-all;
                    `}
                    title={bucket.resourceName?.buckets?.[0].key}
                  >
                    <strong>{bucket.key_as_string}</strong> {bucket.resourceName?.buckets?.[0].key}
                  </EuiTextBlockTruncate>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="xs" color="subdued">
                  {bucket.resourceSubType?.buckets?.[0].key}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    case GROUPING_OPTIONS.RULE_NAME:
      return nullGroupMessage ? (
        <NullGroupComponent title={NULL_GROUPING_MESSAGES.RULE_NAME} field={selectedGroup} />
      ) : (
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="none">
              <EuiFlexItem>
                <EuiText size="s">
                  <strong>{bucket.key_as_string}</strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="xs" color="subdued">
                  {firstNonNullValue(bucket.benchmarkName?.buckets?.[0].key)}{' '}
                  {firstNonNullValue(bucket.benchmarkVersion?.buckets?.[0].key)}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    case GROUPING_OPTIONS.CLOUD_ACCOUNT_NAME:
      return nullGroupMessage ? (
        <NullGroupComponent
          title={NULL_GROUPING_MESSAGES.CLOUD_ACCOUNT_NAME}
          field={selectedGroup}
        />
      ) : (
        <EuiFlexGroup alignItems="center" gutterSize="m">
          {benchmarkId && (
            <EuiFlexItem grow={0}>
              <CISBenchmarkIcon
                type={benchmarkId}
                name={firstNonNullValue(bucket.benchmarkName?.buckets?.[0]?.key)}
              />
            </EuiFlexItem>
          )}
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="none">
              <EuiFlexItem>
                <EuiText size="s">
                  <strong>{bucket.key_as_string}</strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="xs" color="subdued">
                  {bucket.benchmarkName?.buckets?.[0]?.key}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    case GROUPING_OPTIONS.ORCHESTRATOR_CLUSTER_NAME:
      return nullGroupMessage ? (
        <NullGroupComponent
          title={NULL_GROUPING_MESSAGES.ORCHESTRATOR_CLUSTER_NAME}
          field={selectedGroup}
        />
      ) : (
        <EuiFlexGroup alignItems="center" gutterSize="m">
          {benchmarkId && (
            <EuiFlexItem grow={0}>
              <CISBenchmarkIcon
                type={benchmarkId}
                name={firstNonNullValue(bucket.benchmarkName?.buckets?.[0]?.key)}
              />
            </EuiFlexItem>
          )}
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="none">
              <EuiFlexItem>
                <EuiText size="s">
                  <strong>{bucket.key_as_string}</strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="xs" color="subdued">
                  {bucket.benchmarkName?.buckets?.[0]?.key}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    default:
      return nullGroupMessage ? (
        <NullGroupComponent title={NULL_GROUPING_MESSAGES.DEFAULT} field={selectedGroup} />
      ) : (
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="none">
              <EuiFlexItem>
                <EuiText size="s">
                  <strong>{bucket.key_as_string}</strong>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
  }
};

const FindingsCountComponent = ({ bucket }: { bucket: RawBucket<FindingsGroupingAggregation> }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiToolTip content={bucket.doc_count}>
      <EuiBadge
        css={css`
          margin-left: ${euiTheme.size.s}};
        `}
        color="hollow"
        data-test-subj={FINDINGS_GROUPING_COUNTER}
      >
        {getAbbreviatedNumber(bucket.doc_count)}
      </EuiBadge>
    </EuiToolTip>
  );
};

const FindingsCount = React.memo(FindingsCountComponent);

const ComplianceBarComponent = ({ bucket }: { bucket: RawBucket<FindingsGroupingAggregation> }) => {
  const { euiTheme } = useEuiTheme();

  const totalFailed = bucket.failedFindings?.doc_count || 0;
  const totalPassed = bucket.doc_count - totalFailed;
  return (
    <ComplianceScoreBar
      size="l"
      overrideCss={css`
        width: 104px;
        margin-left: ${euiTheme.size.s}};
      `}
      totalFailed={totalFailed}
      totalPassed={totalPassed}
    />
  );
};

const ComplianceBar = React.memo(ComplianceBarComponent);

export const groupStatsRenderer = (
  selectedGroup: string,
  bucket: RawBucket<FindingsGroupingAggregation>
): StatRenderer[] => {
  const defaultBadges = [
    {
      title: i18n.translate('xpack.csp.findings.grouping.stats.badges.findings', {
        defaultMessage: 'Findings',
      }),
      renderer: <FindingsCount bucket={bucket} />,
    },
    {
      title: i18n.translate('xpack.csp.findings.grouping.stats.badges.compliance', {
        defaultMessage: 'Compliance',
      }),
      renderer: <ComplianceBar bucket={bucket} />,
    },
  ];

  return defaultBadges;
};
