/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Route, Switch, useParams } from 'react-router-dom';
import { useValues } from 'kea';

import { EuiText, EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { SideNavLink, SideNavItem } from '../../../shared/layout';
import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { AppLogic } from '../../app_logic';
import {
  getEngineRoute,
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
import { getAppSearchUrl } from '../../../shared/enterprise_search_url';

import './engine_nav.scss';

export const EngineRouter: React.FC = () => {
  const {
    myRole: { canViewEngineAnalytics },
  } = useValues(AppLogic);

  // TODO: EngineLogic

  const { engineName } = useParams() as { engineName: string };
  const engineBreadcrumb = [
    i18n.translate('xpack.enterpriseSearch.appSearch.engines.title', {
      defaultMessage: 'Engines',
    }),
    engineName,
  ];

  return (
    // TODO: Add more routes as we migrate them
    <Switch>
      {canViewEngineAnalytics && (
        <Route path={ENGINE_PATH + ENGINE_ANALYTICS_PATH}>
          <SetPageChrome
            trail={[
              ...engineBreadcrumb,
              i18n.translate('xpack.enterpriseSearch.appSearch.engine.analytics.title', {
                defaultMessage: 'Analytics',
              }),
            ]}
          />
          <div data-test-subj="AnalyticsTODO">Just testing right now</div>
        </Route>
      )}
      <Route>
        <SetPageChrome
          trail={[
            ...engineBreadcrumb,
            i18n.translate('xpack.enterpriseSearch.appSearch.engine.overview.title', {
              defaultMessage: 'Overview',
            }),
          ]}
        />
        <div data-test-subj="EngineOverviewTODO">Overview</div>
      </Route>
    </Switch>
  );
};

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

  // TODO: Use EngineLogic
  const isSampleEngine = true;
  const isMetaEngine = false;
  const { engineName } = useParams() as { engineName: string };
  const engineRoute = engineName && getEngineRoute(engineName);

  if (!engineName) return null;

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
      <SideNavLink to={engineRoute} data-test-subj="EngineOverviewLink">
        {i18n.translate('xpack.enterpriseSearch.appSearch.engine.overview.title', {
          defaultMessage: 'Overview',
        })}
      </SideNavLink>
      {canViewEngineAnalytics && (
        <SideNavLink to={engineRoute + ENGINE_ANALYTICS_PATH} data-test-subj="EngineAnalyticsLink">
          {i18n.translate('xpack.enterpriseSearch.appSearch.engine.analytics.title', {
            defaultMessage: 'Analytics',
          })}
        </SideNavLink>
      )}
      {canViewEngineDocuments && (
        <SideNavLink
          isExternal
          to={getAppSearchUrl(engineRoute + ENGINE_DOCUMENTS_PATH)}
          data-test-subj="EngineDocumentsLink"
        >
          {i18n.translate('xpack.enterpriseSearch.appSearch.engine.documents.title', {
            defaultMessage: 'Documents',
          })}
        </SideNavLink>
      )}
      {canViewEngineSchema && (
        <SideNavLink
          isExternal
          to={getAppSearchUrl(engineRoute + ENGINE_SCHEMA_PATH)}
          data-test-subj="EngineSchemaLink"
        >
          {i18n.translate('xpack.enterpriseSearch.appSearch.engine.schema.title', {
            defaultMessage: 'Schema',
          })}
          {/* TODO: Engine schema warning icon */}
        </SideNavLink>
      )}
      {canViewEngineCrawler && !isMetaEngine && !isSampleEngine && (
        <SideNavLink
          isExternal
          to={getAppSearchUrl(engineRoute + ENGINE_CRAWLER_PATH)}
          data-test-subj="EngineCrawlerLink"
        >
          {i18n.translate('xpack.enterpriseSearch.appSearch.engine.crawler.title', {
            defaultMessage: 'Crawler',
          })}
        </SideNavLink>
      )}
      {canViewMetaEngineSourceEngines && isMetaEngine && (
        <SideNavLink
          isExternal
          to={getAppSearchUrl(engineRoute + META_ENGINE_SOURCE_ENGINES_PATH)}
          data-test-subj="MetaEngineEnginesLink"
        >
          {i18n.translate('xpack.enterpriseSearch.appSearch.metaEngine.navLink', {
            defaultMessage: 'Engines',
          })}
        </SideNavLink>
      )}
      {canManageEngineRelevanceTuning && (
        <SideNavLink
          isExternal
          to={getAppSearchUrl(engineRoute + ENGINE_RELEVANCE_TUNING_PATH)}
          data-test-subj="EngineRelevanceTuningLink"
        >
          {i18n.translate('xpack.enterpriseSearch.appSearch.engine.relevanceTuning.title', {
            defaultMessage: 'Relevance Tuning',
          })}
          {/* TODO: invalid boosts error icon */}
        </SideNavLink>
      )}
      {canManageEngineSynonyms && (
        <SideNavLink
          isExternal
          to={getAppSearchUrl(engineRoute + ENGINE_SYNONYMS_PATH)}
          data-test-subj="EngineSynonymsLink"
        >
          {i18n.translate('xpack.enterpriseSearch.appSearch.engine.synonyms.title', {
            defaultMessage: 'Synonyms',
          })}
        </SideNavLink>
      )}
      {canManageEngineCurations && (
        <SideNavLink
          isExternal
          to={getAppSearchUrl(engineRoute + ENGINE_CURATIONS_PATH)}
          data-test-subj="EngineCurationsLink"
        >
          {i18n.translate('xpack.enterpriseSearch.appSearch.engine.curations.title', {
            defaultMessage: 'Curations',
          })}
        </SideNavLink>
      )}
      {canManageEngineResultSettings && (
        <SideNavLink
          isExternal
          to={getAppSearchUrl(engineRoute + ENGINE_RESULT_SETTINGS_PATH)}
          data-test-subj="EngineResultSettingsLink"
        >
          {i18n.translate('xpack.enterpriseSearch.appSearch.engine.resultSettings.title', {
            defaultMessage: 'Result Settings',
          })}
        </SideNavLink>
      )}
      {canManageEngineSearchUi && (
        <SideNavLink
          isExternal
          to={getAppSearchUrl(engineRoute + ENGINE_SEARCH_UI_PATH)}
          data-test-subj="EngineSearchUILink"
        >
          {i18n.translate('xpack.enterpriseSearch.appSearch.engine.searchUI.title', {
            defaultMessage: 'Search UI',
          })}
        </SideNavLink>
      )}
      {canViewEngineApiLogs && (
        <SideNavLink
          isExternal
          to={getAppSearchUrl(engineRoute + ENGINE_API_LOGS_PATH)}
          data-test-subj="EngineAPILogsLink"
        >
          {i18n.translate('xpack.enterpriseSearch.appSearch.engine.apiLogs.title', {
            defaultMessage: 'API Logs',
          })}
        </SideNavLink>
      )}
    </>
  );
};
