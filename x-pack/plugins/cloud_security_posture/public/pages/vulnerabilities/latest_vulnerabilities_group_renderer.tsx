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
import { GroupPanelRenderer, RawBucket, StatRenderer } from '@kbn/securitysolution-grouping/src';
import React from 'react';
import { VulnerabilitiesGroupingAggregation } from './hooks/use_grouped_vulnerabilities';
import { GROUPING_OPTIONS } from './constants';
import { VULNERABILITIES_GROUPING_COUNTER } from './test_subjects';
import { NULL_GROUPING_MESSAGES, NULL_GROUPING_UNIT, VULNERABILITIES } from './translations';
import { getAbbreviatedNumber } from '../../common/utils/get_abbreviated_number';
import { LoadingGroup, NullGroup } from '../../components/cloud_security_grouping';

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

  switch (selectedGroup) {
    case GROUPING_OPTIONS.RESOURCE_NAME:
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
                    title={bucket.resourceId?.buckets?.[0].key}
                  >
                    <strong>{bucket.key_as_string}</strong> {bucket.resourceId?.buckets?.[0].key}
                  </EuiTextBlockTruncate>
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
          margin-left: ${euiTheme.size.s}};
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

export const groupStatsRenderer = (
  selectedGroup: string,
  bucket: RawBucket<VulnerabilitiesGroupingAggregation>
): StatRenderer[] => {
  const defaultBadges = [
    {
      title: VULNERABILITIES,
      renderer: <VulnerabilitiesCount bucket={bucket} />,
    },
  ];

  return defaultBadges;
};
