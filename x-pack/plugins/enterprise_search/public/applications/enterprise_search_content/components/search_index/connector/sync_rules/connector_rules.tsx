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

import { BetaBadge } from '../../../../../shared/beta/beta_badge';

import { docLinks } from '../../../../../shared/doc_links';

import { ConnectorViewLogic } from '../../../connector_detail/connector_view_logic';
import { FilteringRulesTable } from '../../../shared/filtering_rules_table/filtering_rules_table';

import { ConnectorFilteringLogic } from './connector_filtering_logic';
import { EditSyncRulesFlyout } from './edit_sync_rules_flyout';
import { SyncRulesStateCallouts } from './sync_rules_callouts';

export const ConnectorSyncRules: React.FC = () => {
  const { indexName, hasAdvancedFilteringFeature, hasBasicFilteringFeature } =
    useValues(ConnectorViewLogic);
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
              <EuiFlexGroup alignItems="center" justifyContent="flexStart" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiTitle size="s">
                    <h2>
                      {i18n.translate('xpack.enterpriseSearch.index.connector.syncRules.title', {
                        defaultMessage: 'Sync rules ',
                      })}
                    </h2>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <BetaBadge />
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer />
              <EuiText size="s">
                <p>
                  {i18n.translate('xpack.enterpriseSearch.index.connector.syncRules.description', {
                    defaultMessage: `Include or exclude high level items, file types and (file or folder) paths to
                    synchronize from {indexName}. Everything is included by default. Each document is
                    tested against the rules below and the first rule that matches will be applied.`,
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
                          defaultMessage:
                            'These rules apply to documents during the integration filtering phase.',
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
                          defaultMessage:
                            'These rules apply before the data is obtained from the data source.',
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
