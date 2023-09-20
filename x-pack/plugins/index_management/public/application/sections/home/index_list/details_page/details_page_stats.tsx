/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useState, useCallback, useEffect } from 'react';
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
import { IndicesStatsResponse } from '@elastic/elasticsearch/lib/api/types';
import { SectionLoading, Error } from '../../../../../shared_imports';
import { loadIndexStatistics, documentationService } from '../../../../services';

interface Props {
  isIndexOpen: boolean;
}

export const DetailsPageStats: FunctionComponent<
  RouteComponentProps<{ indexName: string }> & Props
> = ({
  match: {
    params: { indexName },
  },
  isIndexOpen,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>();
  const [indexStats, setIndexStats] = useState<IndicesStatsResponse | null>();

  const fetchIndexStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error: loadingError } = await loadIndexStatistics(indexName);
      setIsLoading(false);
      setError(loadingError);
      setIndexStats(data);
    } catch (e) {
      setIsLoading(false);
      setError(e);
    }
  }, [indexName]);

  useEffect(() => {
    if (isIndexOpen) {
      fetchIndexStats();
    }
  }, [fetchIndexStats, isIndexOpen]);

  if (isIndexOpen === false) {
    return (
      <EuiPageTemplate.EmptyPrompt
        data-test-subj="indexStatsNotAvailableWarning"
        iconType="warning"
        color="warning"
        title={
          <h2>
            <FormattedMessage
              id="xpack.idxMgmt.indexDetails.stats.statsNotAvailableTitle"
              defaultMessage="Index stats not available"
            />
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.idxMgmt.indexDetails.stats.statsNotAvailableDescription"
              defaultMessage="To view index stats, verify your index is open."
            />
          </p>
        }
      />
    );
  }

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
        data-test-subj="indexDetailsStatsError"
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
                defaultMessage="We encountered an error loading the stats for index {indexName}."
                values={{
                  indexName,
                }}
              />
            </EuiText>
            <EuiSpacer />
            <EuiButton
              iconSide="right"
              onClick={fetchIndexStats}
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
              data-test-subj="indexDetailsStatsCodeBlock"
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
