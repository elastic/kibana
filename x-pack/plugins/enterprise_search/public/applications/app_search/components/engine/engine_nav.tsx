/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiText, EuiBadge, EuiIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { getAppSearchUrl } from '../../../shared/enterprise_search_url';
import { SideNavLink, SideNavItem } from '../../../shared/layout';
import { AppLogic } from '../../app_logic';
import {
  ENGINE_PATH,
  ENGINE_ANALYTICS_PATH,
  ENGINE_DOCUMENTS_PATH,
  ENGINE_SCHEMA_PATH,
  ENGINE_CRAWLER_PATH,
  META_ENGINE_SOURCE_ENGINES_PATH,
  ENGINE_RELEVANCE_TUNING_PATH,
  ENGINE_SYNONYMS_PATH,
  ENGINE_CURATIONS_PATH,
  ENGINE_RESULT_SETTINGS_PATH,
  ENGINE_SEARCH_UI_PATH,
  ENGINE_API_LOGS_PATH,
} from '../../routes';
import { ANALYTICS_TITLE } from '../analytics';
import { API_LOGS_TITLE } from '../api_logs';
import { CRAWLER_TITLE } from '../crawler';
import { CURATIONS_TITLE } from '../curations';
import { DOCUMENTS_TITLE } from '../documents';
import { OVERVIEW_TITLE } from '../engine_overview';
import { ENGINES_TITLE } from '../engines';
import { RELEVANCE_TUNING_TITLE } from '../relevance_tuning';
import { RESULT_SETTINGS_TITLE } from '../result_settings';
import { SCHEMA_TITLE } from '../schema';
import { SEARCH_UI_TITLE } from '../search_ui';
import { SYNONYMS_TITLE } from '../synonyms';

import { EngineDetails } from './types';

import { EngineLogic, generateEnginePath } from './';

import './engine_nav.scss';

export const EngineNav: React.FC = () => {
  const {
    myRole: {
      canViewEngineAnalytics,
      canViewEngineDocuments,
      canViewEngineSchema,
      canViewEngineCrawler,
      canViewMetaEngineSourceEngines,
      canManageEngineSynonyms,
      canManageEngineCurations,
      canManageEngineRelevanceTuning,
      canManageEngineResultSettings,
      canManageEngineSearchUi,
      canViewEngineApiLogs,
    },
  } = useValues(AppLogic);

  const {
    engineName,
    dataLoading,
    isSampleEngine,
    isMetaEngine,
    hasSchemaConflicts,
    hasUnconfirmedSchemaFields,
    engine,
  } = useValues(EngineLogic);

  if (dataLoading) return null;
  if (!engineName) return null;

  const { invalidBoosts, unsearchedUnconfirmedFields } = engine as Required<EngineDetails>;

  return (
    <>
      <SideNavItem className="appSearchNavEngineLabel" data-test-subj="EngineLabel">
        <EuiText color="subdued" size="s">
          <div className="eui-textTruncate">{engineName.toUpperCase()}</div>
          {isSampleEngine && (
            <EuiBadge>
              {i18n.translate('xpack.enterpriseSearch.appSearch.engine.sampleEngineBadge', {
                defaultMessage: 'SAMPLE ENGINE',
              })}
            </EuiBadge>
          )}
          {isMetaEngine && (
            <EuiBadge>
              {i18n.translate('xpack.enterpriseSearch.appSearch.engine.metaEngineBadge', {
                defaultMessage: 'META ENGINE',
              })}
            </EuiBadge>
          )}
        </EuiText>
      </SideNavItem>
      <SideNavLink to={generateEnginePath(ENGINE_PATH)} data-test-subj="EngineOverviewLink">
        {OVERVIEW_TITLE}
      </SideNavLink>
      {canViewEngineAnalytics && (
        <SideNavLink
          to={generateEnginePath(ENGINE_ANALYTICS_PATH)}
          shouldShowActiveForSubroutes
          data-test-subj="EngineAnalyticsLink"
        >
          {ANALYTICS_TITLE}
        </SideNavLink>
      )}
      {canViewEngineDocuments && (
        <SideNavLink
          to={generateEnginePath(ENGINE_DOCUMENTS_PATH)}
          shouldShowActiveForSubroutes
          data-test-subj="EngineDocumentsLink"
        >
          {DOCUMENTS_TITLE}
        </SideNavLink>
      )}
      {canViewEngineSchema && (
        <SideNavLink
          to={generateEnginePath(ENGINE_SCHEMA_PATH)}
          shouldShowActiveForSubroutes
          data-test-subj="EngineSchemaLink"
        >
          <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none">
            <EuiFlexItem>{SCHEMA_TITLE}</EuiFlexItem>
            <EuiFlexItem className="appSearchNavIcons">
              {hasUnconfirmedSchemaFields && (
                <EuiIcon
                  type="iInCircle"
                  color="primary"
                  title={i18n.translate(
                    'xpack.enterpriseSearch.appSearch.engine.schema.unconfirmedFields',
                    { defaultMessage: 'New unconfirmed fields' }
                  )}
                  data-test-subj="EngineNavSchemaUnconfirmedFields"
                />
              )}
              {hasSchemaConflicts && (
                <EuiIcon
                  type="alert"
                  color="warning"
                  title={i18n.translate(
                    'xpack.enterpriseSearch.appSearch.engine.schema.conflicts',
                    { defaultMessage: 'Schema conflicts' }
                  )}
                  data-test-subj="EngineNavSchemaConflicts"
                />
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </SideNavLink>
      )}
      {canViewEngineCrawler && !isMetaEngine && (
        <SideNavLink
          isExternal
          to={getAppSearchUrl(generateEnginePath(ENGINE_CRAWLER_PATH))}
          data-test-subj="EngineCrawlerLink"
        >
          {CRAWLER_TITLE}
        </SideNavLink>
      )}
      {canViewMetaEngineSourceEngines && isMetaEngine && (
        <SideNavLink
          to={generateEnginePath(META_ENGINE_SOURCE_ENGINES_PATH)}
          data-test-subj="MetaEngineEnginesLink"
        >
          {ENGINES_TITLE}
        </SideNavLink>
      )}
      {canManageEngineRelevanceTuning && (
        <SideNavLink
          to={generateEnginePath(ENGINE_RELEVANCE_TUNING_PATH)}
          data-test-subj="EngineRelevanceTuningLink"
        >
          <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none">
            <EuiFlexItem>{RELEVANCE_TUNING_TITLE}</EuiFlexItem>
            <EuiFlexItem className="appSearchNavIcons">
              {invalidBoosts && (
                <EuiIcon
                  type="alert"
                  color="warning"
                  title={i18n.translate(
                    'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.invalidBoosts',
                    { defaultMessage: 'Invalid boosts' }
                  )}
                  data-test-subj="EngineNavRelevanceTuningInvalidBoosts"
                />
              )}
              {unsearchedUnconfirmedFields && (
                <EuiIcon
                  type="alert"
                  color="warning"
                  title={i18n.translate(
                    'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.unsearchedFields',
                    { defaultMessage: 'Unsearched fields' }
                  )}
                  data-test-subj="EngineNavRelevanceTuningUnsearchedFields"
                />
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </SideNavLink>
      )}
      {canManageEngineSynonyms && (
        <SideNavLink
          to={generateEnginePath(ENGINE_SYNONYMS_PATH)}
          data-test-subj="EngineSynonymsLink"
        >
          {SYNONYMS_TITLE}
        </SideNavLink>
      )}
      {canManageEngineCurations && (
        <SideNavLink
          to={generateEnginePath(ENGINE_CURATIONS_PATH)}
          shouldShowActiveForSubroutes
          data-test-subj="EngineCurationsLink"
        >
          {CURATIONS_TITLE}
        </SideNavLink>
      )}
      {canManageEngineResultSettings && (
        <SideNavLink
          to={generateEnginePath(ENGINE_RESULT_SETTINGS_PATH)}
          data-test-subj="EngineResultSettingsLink"
        >
          {RESULT_SETTINGS_TITLE}
        </SideNavLink>
      )}
      {canManageEngineSearchUi && (
        <SideNavLink
          to={generateEnginePath(ENGINE_SEARCH_UI_PATH)}
          data-test-subj="EngineSearchUILink"
        >
          {SEARCH_UI_TITLE}
        </SideNavLink>
      )}
      {canViewEngineApiLogs && (
        <SideNavLink
          to={generateEnginePath(ENGINE_API_LOGS_PATH)}
          data-test-subj="EngineAPILogsLink"
        >
          {API_LOGS_TITLE}
        </SideNavLink>
      )}
    </>
  );
};
