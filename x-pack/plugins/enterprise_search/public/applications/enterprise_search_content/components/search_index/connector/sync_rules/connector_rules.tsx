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

import { docLinks } from '../../../../../shared/doc_links';

import { FilteringRulesTable } from '../../../shared/filtering_rules_table/filtering_rules_table';
import { IndexViewLogic } from '../../index_view_logic';

import { ConnectorFilteringLogic } from './connector_filtering_logic';
import { EditSyncRulesFlyout } from './edit_sync_rules_flyout';
import { SyncRulesStateCallouts } from './sync_rules_callouts';

export const ConnectorSyncRules: React.FC = () => {
  const { indexName, hasAdvancedFilteringFeature, hasBasicFilteringFeature } =
    useValues(IndexViewLogic);
  const { applyDraft, setLocalFilteringRules, setLocalAdvancedSnippet, setIsEditing } =
    useActions(ConnectorFilteringLogic);
  const { advancedSnippet, draftErrors, draftState, filteringRules, hasDraft, isEditing } =
    useValues(ConnectorFilteringLogic);

  return (
    <>
      {isEditing && (
        <EditSyncRulesFlyout
          errors={draftErrors}
          hasAdvancedFilteringFeature={hasAdvancedFilteringFeature}
          hasBasicFilteringFeature={hasBasicFilteringFeature}
          revertLocalFilteringRules={() => setLocalFilteringRules(filteringRules)}
          revertLocalAdvancedFiltering={() => setLocalAdvancedSnippet(advancedSnippet)}
          setIsEditing={setIsEditing}
        />
      )}
      <EuiSpacer />
      <EuiFlexGroup direction="column">
        {hasDraft && (
          <EuiFlexItem>
            <SyncRulesStateCallouts
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
                  {i18n.translate('xpack.enterpriseSearch.index.connector.syncRules.title', {
                    defaultMessage: 'Sync rules ',
                  })}
                </h3>
              </EuiTitle>
              <EuiSpacer />
              <EuiText size="s">
                <p>
                  {i18n.translate('xpack.enterpriseSearch.index.connector.syncRules.description', {
                    defaultMessage: `Include or exclude high level items, file types and (file or folder) paths to
                    synchronize from {indexName}. Everything is included by default. Each document is
                    tested against the reules below and the first rule that matches will be applied.`,
                    values: {
                      indexName,
                    },
                  })}
                </p>
                <p>
                  <EuiLink href={docLinks.syncRules} external>
                    {i18n.translate(
                      'xpack.enterpriseSearch.index.connector.syncRules.syncRulesLabel',
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
                data-telemetry-id="entSearchContent-connector-syncRules-editRules-editDraftRules"
                color="primary"
                onClick={() => setIsEditing(!isEditing)}
              >
                {hasDraft
                  ? i18n.translate(
                      'xpack.enterpriseSearch.index.connector.syncRules.editFilterRulesTitle',
                      {
                        defaultMessage: 'Edit sync rules',
                      }
                    )
                  : i18n.translate(
                      'xpack.enterpriseSearch.index.connector.syncRules.draftNewFilterRulesTitle',
                      {
                        defaultMessage: 'Draft new sync rules',
                      }
                    )}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {hasBasicFilteringFeature && (
          <EuiFlexItem>
            <EuiPanel color="plain" hasShadow={false} hasBorder>
              <EuiFlexGroup direction="column">
                <EuiFlexItem>
                  <EuiTitle size="s">
                    <h3>
                      {i18n.translate(
                        'xpack.enterpriseSearch.content.index.connector.syncRules.basicRulesTitle',
                        {
                          defaultMessage: 'Basic rules',
                        }
                      )}
                    </h3>
                  </EuiTitle>
                  <EuiSpacer />
                  <EuiText size="s">
                    <p>
                      {i18n.translate(
                        'xpack.enterpriseSearch.content.index.connector.syncRules.basicRulesDescription',
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
        )}
        {hasAdvancedFilteringFeature && !!advancedSnippet && (
          <EuiFlexItem>
            <EuiPanel color="plain" hasShadow={false} hasBorder>
              <EuiFlexGroup direction="column">
                <EuiFlexItem>
                  <EuiTitle size="s">
                    <h3>
                      {i18n.translate(
                        'xpack.enterpriseSearch.content.index.connector.syncRules.advancedRulesTitle',
                        {
                          defaultMessage: 'Advanced rules',
                        }
                      )}
                    </h3>
                  </EuiTitle>
                  <EuiSpacer />
                  <EuiText size="s">
                    <p>
                      {i18n.translate(
                        'xpack.enterpriseSearch.content.index.connector.syncRules.advancedFiltersDescription',
                        {
                          defaultMessage: 'These filters apply to documents at the data source.',
                        }
                      )}
                    </p>
                    <p>
                      <EuiLink external href={docLinks.syncRules}>
                        {i18n.translate(
                          'xpack.enterpriseSearch.content.index.connector.syncRules.advancedFiltersLinkTitle',
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
