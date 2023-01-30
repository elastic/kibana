/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { i18n } from '@kbn/i18n';

import { EngineViewTabs } from '../../routes';
import { EnterpriseSearchEnginesPageTemplate } from '../layout/engines_page_template';

import { EngineViewHeaderActions } from './engine_view_header_actions';
import { EngineViewLogic } from './engine_view_logic';

export const EngineOverview: React.FC = () => {
  const { engineName, isLoadingEngine } = useValues(EngineViewLogic);

  return (
    <EnterpriseSearchEnginesPageTemplate
      pageChrome={[engineName]}
      pageViewTelemetry={EngineViewTabs.OVERVIEW}
      isLoading={isLoadingEngine}
      pageHeader={{
        pageTitle: i18n.translate('xpack.enterpriseSearch.content.engine.overview.pageTitle', {
          defaultMessage: 'Overview',
        }),
        rightSideItems: [<EngineViewHeaderActions />],
      }}
      engineName={engineName}
    />
  );
};
