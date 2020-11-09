/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { Route, Switch, Redirect, useParams } from 'react-router-dom';
import { useValues, useActions } from 'kea';

import { EuiText, EuiBadge, EuiIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { SideNavLink, SideNavItem } from '../../../shared/layout';
import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { setQueuedErrorMessage } from '../../../shared/flash_messages';
import { AppLogic } from '../../app_logic';
import {
  getEngineRoute,
  ENGINES_PATH,
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
import { ENGINES_TITLE } from '../engines';
import {
  OVERVIEW_TITLE,
  ANALYTICS_TITLE,
  DOCUMENTS_TITLE,
  SCHEMA_TITLE,
  CRAWLER_TITLE,
  RELEVANCE_TUNING_TITLE,
  SYNONYMS_TITLE,
  CURATIONS_TITLE,
  RESULT_SETTINGS_TITLE,
  SEARCH_UI_TITLE,
  API_LOGS_TITLE,
} from './constants';

import { EngineLogic } from './';
import { EngineDetails } from './types';

import './engine_nav.scss';

export const EngineRouter: React.FC = () => {
  const {
    myRole: { canViewEngineAnalytics },
  } = useValues(AppLogic);

  const { dataLoading, engineNotFound } = useValues(EngineLogic);
  const { setEngineName, initializeEngine, clearEngine } = useActions(EngineLogic);

  const { engineName } = useParams() as { engineName: string };
  const engineBreadcrumb = [ENGINES_TITLE, engineName];

  useEffect(() => {
    setEngineName(engineName);
    initializeEngine();
    return clearEngine;
  }, [engineName]);

  if (engineNotFound) {
    setQueuedErrorMessage(
      i18n.translate('xpack.enterpriseSearch.appSearch.engine.notFound', {
        defaultMessage: "No engine with name '{engineName}' could be found.",
        values: { engineName },
      })
    );
    return <Redirect to={ENGINES_PATH} />;
  }

  if (dataLoading) return null;

  return (
    // TODO: Add more routes as we migrate them
    <Switch>
      {canViewEngineAnalytics && (
        <Route path={ENGINE_PATH + ENGINE_ANALYTICS_PATH}>
          <SetPageChrome trail={[...engineBreadcrumb, ANALYTICS_TITLE]} />
          <div data-test-subj="AnalyticsTODO">Just testing right now</div>
        </Route>
      )}
      <Route>
        <SetPageChrome trail={[...engineBreadcrumb, OVERVIEW_TITLE]} />
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

  const engineRoute = getEngineRoute(engineName);
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
      <SideNavLink to={engineRoute} data-test-subj="EngineOverviewLink">
        {OVERVIEW_TITLE}
      </SideNavLink>
      {canViewEngineAnalytics && (
        <SideNavLink to={engineRoute + ENGINE_ANALYTICS_PATH} data-test-subj="EngineAnalyticsLink">
          {ANALYTICS_TITLE}
        </SideNavLink>
      )}
      {canViewEngineDocuments && (
        <SideNavLink
          isExternal
          to={getAppSearchUrl(engineRoute + ENGINE_DOCUMENTS_PATH)}
          data-test-subj="EngineDocumentsLink"
        >
          {DOCUMENTS_TITLE}
        </SideNavLink>
      )}
      {canViewEngineSchema && (
        <SideNavLink
          isExternal
          to={getAppSearchUrl(engineRoute + ENGINE_SCHEMA_PATH)}
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
      {canViewEngineCrawler && !isMetaEngine && !isSampleEngine && (
        <SideNavLink
          isExternal
          to={getAppSearchUrl(engineRoute + ENGINE_CRAWLER_PATH)}
          data-test-subj="EngineCrawlerLink"
        >
          {CRAWLER_TITLE}
        </SideNavLink>
      )}
      {canViewMetaEngineSourceEngines && isMetaEngine && (
        <SideNavLink
          isExternal
          to={getAppSearchUrl(engineRoute + META_ENGINE_SOURCE_ENGINES_PATH)}
          data-test-subj="MetaEngineEnginesLink"
        >
          {ENGINES_TITLE}
        </SideNavLink>
      )}
      {canManageEngineRelevanceTuning && (
        <SideNavLink
          isExternal
          to={getAppSearchUrl(engineRoute + ENGINE_RELEVANCE_TUNING_PATH)}
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
          isExternal
          to={getAppSearchUrl(engineRoute + ENGINE_SYNONYMS_PATH)}
          data-test-subj="EngineSynonymsLink"
        >
          {SYNONYMS_TITLE}
        </SideNavLink>
      )}
      {canManageEngineCurations && (
        <SideNavLink
          isExternal
          to={getAppSearchUrl(engineRoute + ENGINE_CURATIONS_PATH)}
          data-test-subj="EngineCurationsLink"
        >
          {CURATIONS_TITLE}
        </SideNavLink>
      )}
      {canManageEngineResultSettings && (
        <SideNavLink
          isExternal
          to={getAppSearchUrl(engineRoute + ENGINE_RESULT_SETTINGS_PATH)}
          data-test-subj="EngineResultSettingsLink"
        >
          {RESULT_SETTINGS_TITLE}
        </SideNavLink>
      )}
      {canManageEngineSearchUi && (
        <SideNavLink
          isExternal
          to={getAppSearchUrl(engineRoute + ENGINE_SEARCH_UI_PATH)}
          data-test-subj="EngineSearchUILink"
        >
          {SEARCH_UI_TITLE}
        </SideNavLink>
      )}
      {canViewEngineApiLogs && (
        <SideNavLink
          isExternal
          to={getAppSearchUrl(engineRoute + ENGINE_API_LOGS_PATH)}
          data-test-subj="EngineAPILogsLink"
        >
          {API_LOGS_TITLE}
        </SideNavLink>
      )}
    </>
  );
};
