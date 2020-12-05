/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';
import { useValues } from 'kea';
import {
  EuiPageContent,
  EuiPageContentHeader,
  EuiPageContentBody,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';

import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { SendAppSearchTelemetry as SendTelemetry } from '../../../shared/telemetry';
import { FlashMessages } from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';
import { LicensingLogic } from '../../../shared/licensing';

import { EngineIcon } from './assets/engine_icon';
import { MetaEngineIcon } from './assets/meta_engine_icon';
import { ENGINES_TITLE, META_ENGINES_TITLE } from './constants';
import { EnginesOverviewHeader, LoadingState, EmptyState } from './components';
import { EnginesTable } from './engines_table';

import './engines_overview.scss';

interface GetEnginesParams {
  type: string;
  pageIndex: number;
}
interface SetEnginesCallbacks {
  setResults: React.Dispatch<React.SetStateAction<never[]>>;
  setResultsTotal: React.Dispatch<React.SetStateAction<number>>;
}

export const EnginesOverview: React.FC = () => {
  const { http } = useValues(HttpLogic);
  const { hasPlatinumLicense } = useValues(LicensingLogic);

  const [isLoading, setIsLoading] = useState(true);
  const [engines, setEngines] = useState([]);
  const [enginesPage, setEnginesPage] = useState(1);
  const [enginesTotal, setEnginesTotal] = useState(0);
  const [metaEngines, setMetaEngines] = useState([]);
  const [metaEnginesPage, setMetaEnginesPage] = useState(1);
  const [metaEnginesTotal, setMetaEnginesTotal] = useState(0);

  const getEnginesData = async ({ type, pageIndex }: GetEnginesParams) => {
    return await http.get('/api/app_search/engines', {
      query: { type, pageIndex },
    });
  };
  const setEnginesData = async (params: GetEnginesParams, callbacks: SetEnginesCallbacks) => {
    const response = await getEnginesData(params);

    callbacks.setResults(response.results);
    callbacks.setResultsTotal(response.meta.page.total_results);

    setIsLoading(false);
  };

  useEffect(() => {
    const params = { type: 'indexed', pageIndex: enginesPage };
    const callbacks = { setResults: setEngines, setResultsTotal: setEnginesTotal };

    setEnginesData(params, callbacks);
  }, [enginesPage]);

  useEffect(() => {
    if (hasPlatinumLicense) {
      const params = { type: 'meta', pageIndex: metaEnginesPage };
      const callbacks = { setResults: setMetaEngines, setResultsTotal: setMetaEnginesTotal };

      setEnginesData(params, callbacks);
    }
  }, [hasPlatinumLicense, metaEnginesPage]);

  if (isLoading) return <LoadingState />;
  if (!engines.length) return <EmptyState />;

  return (
    <>
      <SetPageChrome />
      <SendTelemetry action="viewed" metric="engines_overview" />

      <EnginesOverviewHeader />
      <EuiPageContent panelPaddingSize="s" className="enginesOverview">
        <FlashMessages />
        <EuiPageContentHeader>
          <EuiTitle size="s">
            <h2>
              <EngineIcon /> {ENGINES_TITLE}
            </h2>
          </EuiTitle>
        </EuiPageContentHeader>
        <EuiPageContentBody data-test-subj="appSearchEngines">
          <EnginesTable
            data={engines}
            pagination={{
              totalEngines: enginesTotal,
              pageIndex: enginesPage - 1,
              onPaginate: setEnginesPage,
            }}
          />
        </EuiPageContentBody>

        {metaEngines.length > 0 && (
          <>
            <EuiSpacer size="xl" />
            <EuiPageContentHeader>
              <EuiTitle size="s">
                <h2>
                  <MetaEngineIcon /> {META_ENGINES_TITLE}
                </h2>
              </EuiTitle>
            </EuiPageContentHeader>
            <EuiPageContentBody data-test-subj="appSearchMetaEngines">
              <EnginesTable
                data={metaEngines}
                pagination={{
                  totalEngines: metaEnginesTotal,
                  pageIndex: metaEnginesPage - 1,
                  onPaginate: setMetaEnginesPage,
                }}
              />
            </EuiPageContentBody>
          </>
        )}
      </EuiPageContent>
    </>
  );
};
