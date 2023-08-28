/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiSpacer,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCodeBlock,
  EuiTitle,
  EuiText,
  EuiCode,
  EuiIcon,
  EuiButton,
  EuiPageTemplate,
} from '@elastic/eui';

import { SectionLoading } from '../../../../../../shared_imports';
import { useLoadIndexStats } from '../../../../../services';

interface Props {
  indexName: string;
}

export const StatsTab: React.FunctionComponent<Props> = ({ indexName }) => {
  const { data: indexStats, isLoading, error, resendRequest } = useLoadIndexStats(indexName);

  if (isLoading) {
    return (
      <SectionLoading>
        <FormattedMessage
          id="xpack.idxMgmt.indexDetails.indexStatsTab.loadingIndexStats"
          defaultMessage="Loading index stats…"
        />
      </SectionLoading>
    );
  }

  if (error) {
    return (
      <EuiPageTemplate.EmptyPrompt
        data-test-subj="indexStatsErrorLoadingDetails"
        color="danger"
        iconType="warning"
        title={
          <h2>
            <FormattedMessage
              id="xpack.idxMgmt.indexDetails.indexStatsTab.errorTitle"
              defaultMessage="Unable to load index stats"
            />
          </h2>
        }
        body={
          <>
            <EuiText color="subdued">
              <FormattedMessage
                id="xpack.idxMgmt.indexDetails.indexStatsTab.errorDescription"
                defaultMessage="There was an error loading stats for index {indexName}."
                values={{
                  indexName,
                }}
              />
            </EuiText>
            <EuiSpacer />
            <EuiButton
              iconSide="right"
              onClick={resendRequest}
              iconType="refresh"
              color="danger"
              data-test-subj="reloadIndexStatsButton"
            >
              <FormattedMessage
                id="xpack.idxMgmt.indexDetails.indexStatsTab.reloadButtonLabel"
                defaultMessage="Reload"
              />
            </EuiButton>
          </>
        }
      />
    );
  }

  if (indexStats) {
    return (
      <EuiFlexGroup alignItems="flexStart">
        <EuiFlexItem grow={7}>
          <EuiPanel>
            <EuiCodeBlock isCopyable language="json" fontSize="m" paddingSize="m">
              {JSON.stringify(indexStats, null, 2)}
            </EuiCodeBlock>
          </EuiPanel>
        </EuiFlexItem>

        <EuiFlexItem grow={3}>
          <EuiPanel>
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiIcon type="iInCircle" />
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h2>
                    <FormattedMessage
                      id="xpack.idxMgmt.indexDetails.indexStatsTab.indexStatsTitle"
                      defaultMessage="About index stats"
                    />
                  </h2>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.idxMgmt.indexDetails.indexStatsTab.indexStatsDescription"
                  defaultMessage="Index stats contains high-level aggregation and statistics for an index. The {primariesField} field represents the values for only primary shards, while the {totalField} field contains the accumulated values for both primary and replica shards."
                  values={{
                    primariesField: <EuiCode>primaries</EuiCode>,
                    totalField: <EuiCode>total</EuiCode>,
                  }}
                />
              </p>
            </EuiText>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return null;
};
