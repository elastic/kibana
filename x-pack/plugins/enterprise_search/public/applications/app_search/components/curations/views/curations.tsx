/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useValues, useActions } from 'kea';

import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { EuiButtonTo } from '../../../../shared/react_router_helpers';

import { ENGINE_CURATIONS_NEW_PATH } from '../../../routes';
import { EngineLogic, generateEnginePath } from '../../engine';
import { AppSearchPageTemplate } from '../../layout';

import { CURATIONS_OVERVIEW_TITLE, CREATE_NEW_CURATION_TITLE } from '../constants';
import { CurationsLogic } from '../curations_logic';
import { getCurationsBreadcrumbs } from '../utils';

import { CurationsHistory } from './curations_history/curations_history';
import { CurationsOverview } from './curations_overview';
import { CurationsSettings } from './curations_settings';

export const Curations: React.FC = () => {
  const { dataLoading, meta, selectedPageTab } = useValues(CurationsLogic);
  const { loadCurations, onSelectPageTab } = useActions(CurationsLogic);
  const {
    engine: { adaptive_relevance_suggestions_active: adaptiveRelevanceSuggestionsActive },
  } = useValues(EngineLogic);

  const suggestionsEnabled = adaptiveRelevanceSuggestionsActive;

  const OVERVIEW_TAB = {
    label: i18n.translate(
      'xpack.enterpriseSearch.appSearch.engine.curations.overviewPageTabLabel',
      {
        defaultMessage: 'Overview',
      }
    ),
    isSelected: selectedPageTab === 'overview',
    onClick: () => onSelectPageTab('overview'),
  };

  const HISTORY_TAB = {
    label: i18n.translate('xpack.enterpriseSearch.appSearch.engine.curations.historyPageTabLabel', {
      defaultMessage: 'History',
    }),
    isSelected: selectedPageTab === 'history',
    onClick: () => onSelectPageTab('history'),
  };

  const SETTINGS_TAB = {
    label: i18n.translate(
      'xpack.enterpriseSearch.appSearch.engine.curations.settingsPageTabLabel',
      {
        defaultMessage: 'Settings',
      }
    ),
    isSelected: selectedPageTab === 'settings',
    onClick: () => onSelectPageTab('settings'),
    append: suggestionsEnabled ? undefined : (
      <EuiBadge color="success">
        {i18n.translate('xpack.enterpriseSearch.appSearch.engine.curations.newBadgeLabel', {
          defaultMessage: 'New!',
        })}
      </EuiBadge>
    ),
  };

  const pageTabs = adaptiveRelevanceSuggestionsActive
    ? [OVERVIEW_TAB, HISTORY_TAB, SETTINGS_TAB]
    : [OVERVIEW_TAB, SETTINGS_TAB];

  useEffect(() => {
    loadCurations();
  }, [meta.page.current]);

  return (
    <AppSearchPageTemplate
      pageChrome={getCurationsBreadcrumbs()}
      pageHeader={{
        pageTitle: CURATIONS_OVERVIEW_TITLE,
        rightSideItems: [
          <EuiButtonTo
            to={generateEnginePath(ENGINE_CURATIONS_NEW_PATH)}
            iconType="plusInCircle"
            fill
          >
            {CREATE_NEW_CURATION_TITLE}
          </EuiButtonTo>,
        ],
        tabs: dataLoading ? undefined : pageTabs,
      }}
      isLoading={dataLoading}
    >
      {selectedPageTab === 'overview' && <CurationsOverview />}
      {selectedPageTab === 'history' && <CurationsHistory />}
      {selectedPageTab === 'settings' && <CurationsSettings />}
    </AppSearchPageTemplate>
  );
};
