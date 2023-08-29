/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { RouteComponentProps } from 'react-router-dom';
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
  EuiLink,
} from '@elastic/eui';

import { css } from '@emotion/react';
import { SectionLoading } from '../../../../../../shared_imports';
import { useLoadIndexStats, documentationService } from '../../../../../services';

export const DetailsPageStats: FunctionComponent<RouteComponentProps<{ indexName: string }>> = ({
  match: {
    params: { indexName },
  },
}) => {
  const { data: indexStats, isLoading, error, resendRequest } = useLoadIndexStats(indexName);

  if (isLoading) {
    return (
      <SectionLoading>
        <FormattedMessage
          id="xpack.idxMgmt.indexDetails.stats.loadingIndexStats"
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
              id="xpack.idxMgmt.indexDetails.stats.errorTitle"
              defaultMessage="Unable to load index stats"
            />
          </h2>
        }
        body={
          <>
            <EuiText color="subdued">
              <FormattedMessage
                id="xpack.idxMgmt.indexDetails.stats.errorDescription"
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
                id="xpack.idxMgmt.indexDetails.stats.reloadButtonLabel"
                defaultMessage="Reload"
              />
            </EuiButton>
          </>
        }
      />
    );
  }

  if (indexStats) {
    // using "rowReverse" to keep docs links on the top of the stats code block on smaller screen
    return (
      <EuiFlexGroup
        wrap
        direction="rowReverse"
        css={css`
          height: 100%;
        `}
        data-test-subj="statsTabContent"
      >
        <EuiFlexItem
          grow={1}
          css={css`
            min-width: 400px;
          `}
        >
          <EuiPanel grow={false} paddingSize="l">
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiIcon type="iInCircle" />
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h2>
                    <FormattedMessage
                      id="xpack.idxMgmt.indexDetails.stats.indexStatsTitle"
                      defaultMessage="About index stats"
                    />
                  </h2>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer size="s" />

            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.idxMgmt.indexDetails.stats.indexStatsDescription"
                  defaultMessage="Index stats contain high-level aggregation and statistics for an index. The {primariesField} field represents the values for only primary shards, while the {totalField} field contains the accumulated values for both primary and replica shards."
                  values={{
                    primariesField: <EuiCode>primaries</EuiCode>,
                    totalField: <EuiCode>total</EuiCode>,
                  }}
                />
              </p>
            </EuiText>

            <EuiSpacer size="m" />
            <EuiLink
              data-test-subj="indexDetailsStatsDocsLink"
              href={documentationService.getIndexStats()}
              target="_blank"
              external
            >
              <FormattedMessage
                id="xpack.idxMgmt.indexDetails.stats.learnMoreLink"
                defaultMessage="Learn more"
              />
            </EuiLink>
          </EuiPanel>
        </EuiFlexItem>

        <EuiFlexItem
          grow={3}
          css={css`
            min-width: 600px;
          `}
        >
          <EuiPanel>
            <EuiCodeBlock
              isCopyable
              language="json"
              paddingSize="m"
              css={css`
                height: 100%;
              `}
            >
              {JSON.stringify(indexStats, null, 2)}
            </EuiCodeBlock>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return null;
};
