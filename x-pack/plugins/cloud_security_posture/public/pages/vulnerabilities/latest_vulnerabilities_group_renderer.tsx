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
import { VulnerabilitiesGroupingAggregation } from './hooks/use_grouped_vulnerabilities';
import { GROUPING_OPTIONS } from './constants';
import { VULNERABILITIES_GROUPING_COUNTER } from './test_subjects';
import { NULL_GROUPING_MESSAGES, NULL_GROUPING_UNIT, VULNERABILITIES } from './translations';
import { getAbbreviatedNumber } from '../../common/utils/get_abbreviated_number';

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
              id="xpack.csp.vulnerabilities.grouping.nullGroupTooltip"
              defaultMessage="The selected {groupingTitle} field, {field} is missing a value for this group of {unit}."
              values={{
                groupingTitle: (
                  <strong>
                    <FormattedMessage
                      id="xpack.csp.vulnerabilities.grouping.nullGroupTooltip.groupingTitle"
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

export const groupPanelRenderer: GroupPanelRenderer<VulnerabilitiesGroupingAggregation> = (
  selectedGroup,
  bucket,
  nullGroupMessage,
  isLoading
) => {
  if (isLoading) {
    return (
      <EuiSkeletonTitle size="s" isLoading={true}>
        <FormattedMessage
          id="xpack.csp.vulnerabilities.grouping.loadingGroupPanelTitle"
          defaultMessage="Loading"
        />
      </EuiSkeletonTitle>
    );
  }
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
