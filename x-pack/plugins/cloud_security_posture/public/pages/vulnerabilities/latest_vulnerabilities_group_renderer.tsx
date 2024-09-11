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
  EuiText,
  EuiTextBlockTruncate,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { GroupPanelRenderer, GroupStatsItem, RawBucket } from '@kbn/grouping/src';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { getCloudProviderNameFromAbbreviation } from '../../../common/utils/helpers';
import { VulnerabilitiesGroupingAggregation } from './hooks/use_grouped_vulnerabilities';
import { VULNERABILITIES_GROUPING_COUNTER } from './test_subjects';
import { NULL_GROUPING_MESSAGES, NULL_GROUPING_UNIT, VULNERABILITIES } from './translations';
import { getAbbreviatedNumber } from '../../common/utils/get_abbreviated_number';
import {
  firstNonNullValue,
  LoadingGroup,
  NullGroup,
} from '../../components/cloud_security_grouping';
import { VulnerabilitySeverityMap } from '../../components/vulnerability_severity_map';
import { CloudProviderIcon } from '../../components/cloud_provider_icon';
import { VULNERABILITY_GROUPING_OPTIONS } from '../../common/constants';

export const groupPanelRenderer: GroupPanelRenderer<VulnerabilitiesGroupingAggregation> = (
  selectedGroup,
  bucket,
  nullGroupMessage,
  isLoading
) => {
  if (isLoading) {
    return <LoadingGroup />;
  }

  const renderNullGroup = (title: string) => (
    <NullGroup title={title} field={selectedGroup} unit={NULL_GROUPING_UNIT} />
  );

  const cloudProvider = firstNonNullValue(bucket.cloudProvider?.buckets?.[0]?.key);
  const description = firstNonNullValue(bucket.description?.buckets?.[0]?.key);
  const cloudProviderName = cloudProvider
    ? getCloudProviderNameFromAbbreviation(cloudProvider)
    : '';

  switch (selectedGroup) {
    case VULNERABILITY_GROUPING_OPTIONS.RESOURCE_NAME:
      return nullGroupMessage ? (
        renderNullGroup(NULL_GROUPING_MESSAGES.RESOURCE_NAME)
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
                    title={bucket.resourceId?.buckets?.[0]?.key}
                  >
                    <strong>{bucket.key_as_string}</strong> {bucket.resourceId?.buckets?.[0]?.key}
                  </EuiTextBlockTruncate>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    case VULNERABILITY_GROUPING_OPTIONS.CLOUD_ACCOUNT_NAME:
      return nullGroupMessage ? (
        renderNullGroup(NULL_GROUPING_MESSAGES.CLOUD_ACCOUNT_NAME)
      ) : (
        <EuiFlexGroup alignItems="center">
          {cloudProvider && (
            <EuiFlexItem grow={0}>
              <CloudProviderIcon cloudProvider={cloudProvider} />
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
                  {cloudProviderName}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    default:
      return nullGroupMessage ? (
        renderNullGroup(NULL_GROUPING_MESSAGES.DEFAULT)
      ) : (
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="none">
              <EuiFlexItem>
                <EuiText size="s">
                  <strong>{bucket.key_as_string}</strong>
                </EuiText>
              </EuiFlexItem>
              {description && (
                <EuiFlexItem>
                  <EuiText size="xs" color="subdued">
                    <EuiTextBlockTruncate
                      lines={1}
                      css={css`
                        word-break: break-all;
                      `}
                    >
                      {description}
                    </EuiTextBlockTruncate>
                  </EuiText>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
  }
};

const VulnerabilitiesCountComponent = ({
  bucket,
}: {
  bucket: RawBucket<VulnerabilitiesGroupingAggregation>;
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiToolTip content={bucket.doc_count}>
      <EuiBadge
        css={css`
          margin-left: ${euiTheme.size.s};
        `}
        color="hollow"
        data-test-subj={VULNERABILITIES_GROUPING_COUNTER}
      >
        {getAbbreviatedNumber(bucket.doc_count)}
      </EuiBadge>
    </EuiToolTip>
  );
};

const VulnerabilitiesCount = React.memo(VulnerabilitiesCountComponent);

const SeverityStatsComponent = ({
  bucket,
}: {
  bucket: RawBucket<VulnerabilitiesGroupingAggregation>;
}) => {
  const severityMap = {
    critical: bucket.critical?.doc_count ?? 0,
    high: bucket.high?.doc_count ?? 0,
    medium: bucket.medium?.doc_count ?? 0,
    low: bucket.low?.doc_count ?? 0,
  };

  return (
    <EuiFlexGroup alignItems="center" gutterSize="xs">
      <EuiFlexItem grow={false}>
        <FormattedMessage
          id="xpack.csp.vulnerabilities.grouping.severity"
          defaultMessage="Severity"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <VulnerabilitySeverityMap total={bucket.doc_count} severityMap={severityMap} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const SeverityStats = React.memo(SeverityStatsComponent);

export const groupStatsRenderer = (
  selectedGroup: string,
  bucket: RawBucket<VulnerabilitiesGroupingAggregation>
): GroupStatsItem[] => [
  {
    title: VULNERABILITIES,
    component: <VulnerabilitiesCount bucket={bucket} />,
  },
  {
    title: '',
    component: <SeverityStats bucket={bucket} />,
  },
];
