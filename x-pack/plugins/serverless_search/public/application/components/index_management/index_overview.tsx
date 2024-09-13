/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedPlural } from '@kbn/i18n-react';
import {
  EuiLoadingSpinner,
  EuiEmptyPrompt,
  EuiFlexGrid,
  EuiFlexItem,
  EuiFlexGroup,
  EuiI18nNumber,
  EuiText,
  EuiBadge,
  EuiButton,
  EuiLink,
  EuiSpacer,
} from '@elastic/eui';

import { Index } from '@kbn/index-management-plugin/common/types/indices';

import { docLinks } from '../../../../common/doc_links';
import { useIndex } from '../../hooks/api/use_index';

import { BadgeList } from '../badge_list';
import { OverviewEmptyPrompt } from './overview_empty_prompt';
import { IndexOverviewPanel, IndexOverviewPanelStat } from './overview_panel';
import { IndexAliasesFlyout } from './index_aliases_flyout';

export interface IndexDetailOverviewProps {
  index: Index;
}

export const IndexDetailOverview: FunctionComponent<IndexDetailOverviewProps> = ({ index }) => {
  const [aliasesFlyoutOpen, setAliasesFlyoutOpen] = React.useState<boolean>(false);
  const { data, isLoading, isError } = useIndex(index.name);
  const indexAliases =
    typeof index.aliases === 'string'
      ? index.aliases.length > 0 && index.aliases !== 'none'
        ? [index.aliases]
        : []
      : index.aliases;

  if (isLoading || !data)
    return (
      <EuiEmptyPrompt
        icon={<EuiLoadingSpinner size="l" />}
        title={
          <h2>
            <FormattedMessage
              id="xpack.serverlessSearch.indexManagement.indexDetails.overview.loading.title"
              defaultMessage="Loading index"
            />
          </h2>
        }
      />
    );
  if (isError) {
    return (
      <EuiEmptyPrompt
        iconType="error"
        color="danger"
        title={
          <h2>
            <FormattedMessage
              id="xpack.serverlessSearch.indexManagement.indexDetails.overview.error.title"
              defaultMessage="Unable to load index"
            />
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.serverlessSearch.indexManagement.indexDetails.overview.error.description"
              defaultMessage="There was an error loading the index."
            />
          </p>
        }
      />
    );
  }

  const indexData = data.index;
  return (
    <>
      {aliasesFlyoutOpen && (
        <IndexAliasesFlyout
          indexName={index.name}
          aliases={indexAliases}
          onClose={() => setAliasesFlyoutOpen(false)}
        />
      )}
      <EuiFlexGrid columns={2}>
        <EuiFlexItem>
          <IndexOverviewPanel
            title={
              <FormattedMessage
                id="xpack.serverlessSearch.indexManagement.indexDetails.overview.dataStreamPanel.title"
                defaultMessage="Data Stream"
              />
            }
            footer={
              <EuiLink
                data-test-subj="serverlessSearchIndexDetailOverviewHowToManageDataStreamsButton"
                href={docLinks.dataStreams}
                external
              >
                <FormattedMessage
                  id="xpack.serverlessSearch.indexManagement.indexDetails.overview.dataStreamPanel.docsLink"
                  defaultMessage="How to manage Data Streams"
                />
              </EuiLink>
            }
          >
            <IndexOverviewPanelStat>{index.data_stream ?? '--'}</IndexOverviewPanelStat>
          </IndexOverviewPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <IndexOverviewPanel
            title={
              <FormattedMessage
                id="xpack.serverlessSearch.indexManagement.indexDetails.overview.aliasesPanel.title"
                defaultMessage="Aliases"
              />
            }
            footer={
              <BadgeList
                badges={
                  indexAliases.length > 0
                    ? indexAliases.map((alias) => <EuiBadge key={alias}>{alias}</EuiBadge>)
                    : [
                        <EuiBadge key="none">
                          <FormattedMessage
                            id="xpack.serverlessSearch.indexManagement.indexDetails.overview.aliasesPanel.noneBadge"
                            defaultMessage="none"
                          />
                        </EuiBadge>,
                      ]
                }
              />
            }
          >
            <EuiFlexGroup alignItems="baseline" justifyContent="spaceBetween" gutterSize="s">
              <EuiFlexItem grow={false}>
                <IndexOverviewPanelStat>
                  <EuiI18nNumber value={indexAliases.length} />
                </IndexOverviewPanelStat>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText color="subdued">
                  <p>
                    <FormattedPlural
                      one={i18n.translate(
                        'xpack.serverlessSearch.indexManagement.indexDetails.overview.aliasesPanel.singleLabel',
                        { defaultMessage: 'Alias' }
                      )}
                      other={i18n.translate(
                        'xpack.serverlessSearch.indexManagement.indexDetails.overview.aliasesPanel.multipleLabel',
                        { defaultMessage: 'Aliases' }
                      )}
                      value={indexAliases.length}
                    />
                  </p>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  disabled={indexAliases.length === 0}
                  data-test-subj="serverlessSearchIndexDetailOverviewViewAllAliasesButton"
                  onClick={() => setAliasesFlyoutOpen(true)}
                >
                  <FormattedMessage
                    id="xpack.serverlessSearch.indexManagement.indexDetails.overview.aliasesPanel.viewAllAliasesBtn"
                    defaultMessage="View All Aliases"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </IndexOverviewPanel>
        </EuiFlexItem>
      </EuiFlexGrid>
      {indexData.count === 0 && (
        <>
          <EuiSpacer />
          <OverviewEmptyPrompt indexName={index.name} connector={indexData.connector} />
        </>
      )}
    </>
  );
};

// Default Export is needed to lazy load this react component
// eslint-disable-next-line import/no-default-export
export default IndexDetailOverview;
