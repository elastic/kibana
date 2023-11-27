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
import { GROUPING_OPTIONS } from './constants';

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

export const groupPanelRenderer: GroupPanelRenderer<FindingsGroupingAggregation> = (
  selectedGroup,
  bucket,
  nullGroupMessage,
  isLoading
) => {
  if (isLoading) {
    return (
      <EuiSkeletonTitle size="s" isLoading={true}>
        <strong>loading</strong>
      </EuiSkeletonTitle>
    );
  }

  const benchmarkId = firstNonNullValue(bucket.benchmarkId?.buckets?.[0]?.key);
  switch (selectedGroup) {
    case GROUPING_OPTIONS.RESOURCE:
      return (
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="none">
              <EuiFlexItem style={{ display: 'inline' }}>
                <EuiText size="s">
                  <EuiTextBlockTruncate
                    lines={2}
                    style={{ wordBreak: 'break-all' }}
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
    case GROUPING_OPTIONS.RULE:
      return (
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
    case GROUPING_OPTIONS.CLOUD_ACCOUNT:
      return nullGroupMessage ? (
        <div
          css={css`
            & .euiToolTipAnchor {
              margin-top: -2px;
              margin-left: 4px;
              vertical-align: top;
            }
          `}
        >
          <strong>No Cloud account</strong>
          <EuiIconTip content={nullGroupMessage} position="right" />
        </div>
      ) : (
        <EuiFlexGroup alignItems="center" gutterSize="m">
          {benchmarkId && (
            <EuiFlexItem grow={0} style={{ marginLeft: 12 }}>
              <CISBenchmarkIcon
                type={benchmarkId}
                name={firstNonNullValue(bucket.benchmarkName?.buckets?.[0]?.key)}
              />
            </EuiFlexItem>
          )}
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="none">
              <EuiFlexItem style={{ display: 'inline' }}>
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
    case GROUPING_OPTIONS.KUBERNETES:
      return nullGroupMessage ? (
        <div
          css={css`
            & .euiToolTipAnchor {
              margin-top: -2px;
              margin-left: 4px;
              vertical-align: top;
            }
          `}
        >
          <strong>No Kubernetes cluster</strong>
          <EuiIconTip content={nullGroupMessage} position="right" />
        </div>
      ) : (
        <EuiFlexGroup alignItems="center" gutterSize="m">
          {benchmarkId && (
            <EuiFlexItem grow={0} style={{ marginLeft: 12 }}>
              <CISBenchmarkIcon
                type={benchmarkId}
                name={firstNonNullValue(bucket.benchmarkName?.buckets?.[0]?.key)}
              />
            </EuiFlexItem>
          )}
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="none">
              <EuiFlexItem style={{ display: 'inline' }}>
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
  }
};

export const groupStatsRenderer = (
  selectedGroup: string,
  bucket: RawBucket<FindingsGroupingAggregation>
): StatRenderer[] => {
  const renderComplianceBar = () => {
    const totalFailed = bucket.failedFindings?.doc_count || 0;

    const totalPassed = bucket.doc_count - totalFailed;
    return (
      <EuiFlexGroup
        style={{
          width: 198,
        }}
        gutterSize="s"
      >
        <EuiFlexItem
          grow={0}
          css={css`
            text-wrap: 'nowrap';
          `}
        >
          <EuiText size="xs">
            <strong>
              <FormattedMessage
                id="xpack.csp.findings.grouping.complianceBar.failedFindings"
                defaultMessage="Failed findings"
              />
            </strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <ComplianceScoreBar
            size="l"
            isReverse
            totalFailed={totalFailed}
            totalPassed={totalPassed}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };
  const renderFindingsCount = () => {
    return (
      <EuiToolTip content={bucket.doc_count}>
        <EuiBadge
          css={css`
            margin-left: 8px;
          `}
          color="hollow"
        >
          {getAbbreviatedNumber(bucket.doc_count)}
        </EuiBadge>
      </EuiToolTip>
    );
  };

  const defaultBadges = [
    {
      title: i18n.translate('xpack.csp.findings.grouping.stats.badges.findings', {
        defaultMessage: 'Findings',
      }),
      renderer: renderFindingsCount(),
    },
    {
      title: '',
      renderer: renderComplianceBar(),
    },
  ];

  return defaultBadges;
};
