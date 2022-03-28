/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useRouteMatch } from 'react-router-dom';

import { useValues } from 'kea';

import { EuiSideNavItemType, EuiText, EuiBadge, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { generateNavLink } from '../../../shared/layout';
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

import { EngineLogic, generateEnginePath } from './';

import './engine_nav.scss';

export const useEngineNav = () => {
  const isEngineRoute = !!useRouteMatch(ENGINE_PATH);
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
    isElasticsearchEngine,
    hasSchemaErrors,
    hasSchemaConflicts,
    hasUnconfirmedSchemaFields,
    engine,
  } = useValues(EngineLogic);

  if (!isEngineRoute) return undefined;
  if (dataLoading) return undefined;
  if (!engineName) return undefined;

  const navItems: Array<EuiSideNavItemType<unknown>> = [
    {
      id: 'engineName',
      name: engineName,
      renderItem: () => (
        <EuiText color="subdued" size="s" className="appSearchNavEngineLabel">
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
          {isElasticsearchEngine && (
            <EuiBadge>
              {i18n.translate('xpack.enterpriseSearch.appSearch.engine.elasticsearchEngineBadge', {
                defaultMessage: 'ELASTICSEARCH INDEX',
              })}
            </EuiBadge>
          )}
        </EuiText>
      ),
      'data-test-subj': 'EngineLabel',
    },
    {
      id: 'overview',
      name: OVERVIEW_TITLE,
      ...generateNavLink({ to: generateEnginePath(ENGINE_PATH) }),
      'data-test-subj': 'EngineOverviewLink',
    },
  ];

  if (canViewEngineAnalytics) {
    navItems.push({
      id: 'analytics',
      name: ANALYTICS_TITLE,
      ...generateNavLink({
        to: generateEnginePath(ENGINE_ANALYTICS_PATH),
        shouldShowActiveForSubroutes: true,
      }),
      'data-test-subj': 'EngineAnalyticsLink',
    });
  }

  if (canViewEngineDocuments) {
    navItems.push({
      id: 'documents',
      name: DOCUMENTS_TITLE,
      ...generateNavLink({
        to: generateEnginePath(ENGINE_DOCUMENTS_PATH),
        shouldShowActiveForSubroutes: true,
      }),
      'data-test-subj': 'EngineDocumentsLink',
    });
  }

  if (canViewEngineSchema) {
    navItems.push({
      id: 'schema',
      name: SCHEMA_TITLE,
      ...generateNavLink({
        to: generateEnginePath(ENGINE_SCHEMA_PATH),
        shouldShowActiveForSubroutes: true,
      }),
      'data-test-subj': 'EngineSchemaLink',
      icon: (
        <>
          {hasSchemaErrors && (
            <EuiIcon
              type="alert"
              color="danger"
              className="appSearchNavIcon"
              title={i18n.translate('xpack.enterpriseSearch.appSearch.engine.schema.errors', {
                defaultMessage: 'Schema change errors',
              })}
              data-test-subj="EngineNavSchemaErrors"
            />
          )}
          {hasUnconfirmedSchemaFields && (
            <EuiIcon
              type="iInCircle"
              color="primary"
              className="appSearchNavIcon"
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
              className="appSearchNavIcon"
              title={i18n.translate('xpack.enterpriseSearch.appSearch.engine.schema.conflicts', {
                defaultMessage: 'Schema conflicts',
              })}
              data-test-subj="EngineNavSchemaConflicts"
            />
          )}
        </>
      ),
    });
  }

  const showCrawlerNavItem = canViewEngineCrawler && !isMetaEngine && !isElasticsearchEngine;
  if (showCrawlerNavItem) {
    navItems.push({
      id: 'crawler',
      name: CRAWLER_TITLE,
      ...generateNavLink({
        to: generateEnginePath(ENGINE_CRAWLER_PATH),
        shouldShowActiveForSubroutes: true,
      }),
      'data-test-subj': 'EngineCrawlerLink',
    });
  }

  if (canViewMetaEngineSourceEngines && isMetaEngine) {
    navItems.push({
      id: 'sourceEngines',
      name: ENGINES_TITLE,
      ...generateNavLink({ to: generateEnginePath(META_ENGINE_SOURCE_ENGINES_PATH) }),
      'data-test-subj': 'MetaEngineEnginesLink',
    });
  }

  if (canManageEngineRelevanceTuning) {
    const { invalidBoosts, unsearchedUnconfirmedFields } = engine;

    navItems.push({
      id: 'relevanceTuning',
      name: RELEVANCE_TUNING_TITLE,
      ...generateNavLink({ to: generateEnginePath(ENGINE_RELEVANCE_TUNING_PATH) }),
      'data-test-subj': 'EngineRelevanceTuningLink',
      icon: (
        <>
          {invalidBoosts && (
            <EuiIcon
              type="alert"
              color="warning"
              className="appSearchNavIcon"
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
              className="appSearchNavIcon"
              title={i18n.translate(
                'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.unsearchedFields',
                { defaultMessage: 'Unsearched fields' }
              )}
              data-test-subj="EngineNavRelevanceTuningUnsearchedFields"
            />
          )}
        </>
      ),
    });
  }

  if (canManageEngineSynonyms) {
    navItems.push({
      id: 'synonyms',
      name: SYNONYMS_TITLE,
      ...generateNavLink({ to: generateEnginePath(ENGINE_SYNONYMS_PATH) }),
      'data-test-subj': 'EngineSynonymsLink',
    });
  }

  if (canManageEngineCurations) {
    navItems.push({
      id: 'curations',
      name: CURATIONS_TITLE,
      ...generateNavLink({
        to: generateEnginePath(ENGINE_CURATIONS_PATH),
        shouldShowActiveForSubroutes: true,
      }),
      'data-test-subj': 'EngineCurationsLink',
    });
  }

  if (canManageEngineResultSettings) {
    navItems.push({
      id: 'resultSettings',
      name: RESULT_SETTINGS_TITLE,
      ...generateNavLink({ to: generateEnginePath(ENGINE_RESULT_SETTINGS_PATH) }),
      'data-test-subj': 'EngineResultSettingsLink',
    });
  }

  if (canManageEngineSearchUi) {
    navItems.push({
      id: 'searchUI',
      name: SEARCH_UI_TITLE,
      ...generateNavLink({ to: generateEnginePath(ENGINE_SEARCH_UI_PATH) }),
      'data-test-subj': 'EngineSearchUILink',
    });
  }

  if (canViewEngineApiLogs) {
    navItems.push({
      id: 'apiLogs',
      name: API_LOGS_TITLE,
      ...generateNavLink({ to: generateEnginePath(ENGINE_API_LOGS_PATH) }),
      'data-test-subj': 'EngineAPILogsLink',
    });
  }

  return navItems;
};
