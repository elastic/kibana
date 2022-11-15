/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FilteringRulesTable } from '../../../shared/filtering_rules_table/filtering_rules_table';
import { IndexViewLogic } from '../../index_view_logic';

import { ConnectorFilteringLogic } from './connector_filtering_logic';
import { EditFilteringFlyout } from './edit_filtering_flyout';
import { FilteringStateCallouts } from './filtering_callouts';

export const ConnectorFiltering: React.FC = () => {
  const { indexName } = useValues(IndexViewLogic);
  const { applyDraft, setLocalFilteringRules, setLocalAdvancedSnippet, setIsEditing } =
    useActions(ConnectorFilteringLogic);
  const { advancedSnippet, draftState, filteringRules, hasDraft, isEditing } =
    useValues(ConnectorFilteringLogic);

  return (
    <>
      {isEditing && (
        <EditFilteringFlyout
          revertLocalFilteringRules={() => setLocalFilteringRules(filteringRules)}
          revertLocalAdvancedFiltering={() => setLocalAdvancedSnippet(advancedSnippet)}
          setIsEditing={setIsEditing}
        />
      )}
      <EuiSpacer />
      <EuiFlexGroup direction="column">
        {hasDraft && (
          <EuiFlexItem>
            <FilteringStateCallouts
              applyDraft={applyDraft}
              editDraft={() => setIsEditing(true)}
              state={draftState}
            />
          </EuiFlexItem>
        )}

        <EuiFlexItem>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem>
              <EuiTitle size="s">
                <h3>
                  {i18n.translate('xpack.enterpriseSearch.index.connector.filtering.title', {
                    defaultMessage: 'Sync filters ',
                  })}
                </h3>
              </EuiTitle>
              <EuiSpacer />
              <EuiText size="s">
                <p>
                  {i18n.translate('xpack.enterpriseSearch.index.connector.filtering.description', {
                    defaultMessage: `Include or exclude high level items, file types and (file or folder) paths to
                    synchronize from {indexName}. Everything is included by default. Each document is
                    tested against the reules below and the first rule that matches will be applied.`,
                    values: {
                      indexName,
                    },
                  })}
                </p>
                <p>
                  <EuiLink href="TODOTODOTODOTODO" external>
                    {i18n.translate(
                      'xpack.enterpriseSearch.index.connector.filtering.syncFiltersLabel',
                      {
                        defaultMessage: 'Learn more about sync rules',
                      }
                    )}
                  </EuiLink>
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                data-telemetry-id="entSearchContent-connector-filtering-editRules-editDraftRules"
                color="primary"
                onClick={() => setIsEditing(!isEditing)}
              >
                {hasDraft
                  ? i18n.translate(
                      'xpack.enterpriseSearch.index.connector.filtering.editFilterRulesTitle',
                      {
                        defaultMessage: 'Edit filter rules',
                      }
                    )
                  : i18n.translate(
                      'xpack.enterpriseSearch.index.connector.filtering.draftNewFilterRulesTitle',
                      {
                        defaultMessage: 'Draft new filter rules',
                      }
                    )}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel color="plain" hasShadow={false} hasBorder>
            <EuiFlexGroup direction="column">
              <EuiFlexItem>
                <EuiTitle size="s">
                  <h3>
                    {i18n.translate(
                      'xpack.enterpriseSearch.content.index.connector.filtering.basicFiltersTitle',
                      {
                        defaultMessage: 'Basic filters',
                      }
                    )}
                  </h3>
                </EuiTitle>
                <EuiSpacer />
                <EuiText size="s">
                  <p>
                    {i18n.translate(
                      'xpack.enterpriseSearch.content.index.connector.filtering.basicFiltersDescription',
                      {
                        defaultMessage: 'These filters apply to documents in post-processing.',
                      }
                    )}
                  </p>
                </EuiText>
              </EuiFlexItem>
              <FilteringRulesTable filteringRules={filteringRules} showOrder />
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
        {!!advancedSnippet && (
          <EuiFlexItem>
            <EuiPanel color="plain" hasShadow={false} hasBorder>
              <EuiFlexGroup direction="column">
                <EuiFlexItem>
                  <EuiTitle size="s">
                    <h3>
                      {i18n.translate(
                        'xpack.enterpriseSearch.content.index.connector.filtering.advancedFiltersTitle',
                        {
                          defaultMessage: 'Advanced filters',
                        }
                      )}
                    </h3>
                  </EuiTitle>
                  <EuiSpacer />
                  <EuiText size="s">
                    <p>
                      {i18n.translate(
                        'xpack.enterpriseSearch.content.index.connector.filtering.advancedFiltersDescription',
                        {
                          defaultMessage: 'These filters apply to documents at the data source.',
                        }
                      )}
                    </p>
                    <p>
                      <EuiLink external href="TODOTODOTODODOTO">
                        {i18n.translate(
                          'xpack.enterpriseSearch.content.index.connector.filtering.advancedFiltersLinkTitle',
                          {
                            defaultMessage: 'Learn more about advanced sync rules.',
                          }
                        )}
                      </EuiLink>
                    </p>
                  </EuiText>
                </EuiFlexItem>
                <EuiCodeBlock isCopyable language="json">
                  {advancedSnippet}
                </EuiCodeBlock>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </>
  );
};
