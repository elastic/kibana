/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useEffect, useState } from 'react';
import {
  EuiPageContent,
  EuiPageContentHeader,
  EuiPageContentBody,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { SendAppSearchTelemetry as SendTelemetry } from '../../../shared/telemetry';
import { FlashMessages } from '../../../shared/flash_messages';
import { LicenseContext, ILicenseContext, hasPlatinumLicense } from '../../../shared/licensing';
import { KibanaContext, IKibanaContext } from '../../../index';

import EnginesIcon from '../../assets/engine.svg';
import MetaEnginesIcon from '../../assets/meta_engine.svg';

import { EngineOverviewHeader, LoadingState, EmptyState } from './components';
import { EngineTable } from './engine_table';

import './engine_overview.scss';

interface IGetEnginesParams {
  type: string;
  pageIndex: number;
}
interface ISetEnginesCallbacks {
  setResults: React.Dispatch<React.SetStateAction<never[]>>;
  setResultsTotal: React.Dispatch<React.SetStateAction<number>>;
}

export const EngineOverview: React.FC = () => {
  const { http } = useContext(KibanaContext) as IKibanaContext;
  const { license } = useContext(LicenseContext) as ILicenseContext;

  const [isLoading, setIsLoading] = useState(true);
  const [engines, setEngines] = useState([]);
  const [enginesPage, setEnginesPage] = useState(1);
  const [enginesTotal, setEnginesTotal] = useState(0);
  const [metaEngines, setMetaEngines] = useState([]);
  const [metaEnginesPage, setMetaEnginesPage] = useState(1);
  const [metaEnginesTotal, setMetaEnginesTotal] = useState(0);

  const getEnginesData = async ({ type, pageIndex }: IGetEnginesParams) => {
    return await http.get('/api/app_search/engines', {
      query: { type, pageIndex },
    });
  };
  const setEnginesData = async (params: IGetEnginesParams, callbacks: ISetEnginesCallbacks) => {
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
    if (hasPlatinumLicense(license)) {
      const params = { type: 'meta', pageIndex: metaEnginesPage };
      const callbacks = { setResults: setMetaEngines, setResultsTotal: setMetaEnginesTotal };

      setEnginesData(params, callbacks);
    }
  }, [license, metaEnginesPage]);

  if (isLoading) return <LoadingState />;
  if (!engines.length) return <EmptyState />;

  return (
    <>
      <SetPageChrome isRoot />
      <SendTelemetry action="viewed" metric="engines_overview" />

      <EngineOverviewHeader />
      <EuiPageContent panelPaddingSize="s" className="engineOverview">
        <FlashMessages />
        <EuiPageContentHeader>
          <EuiTitle size="s">
            <h2>
              <img src={EnginesIcon} alt="" className="engineIcon" />
              <FormattedMessage
                id="xpack.enterpriseSearch.appSearch.enginesOverview.engines"
                defaultMessage="Engines"
              />
            </h2>
          </EuiTitle>
        </EuiPageContentHeader>
        <EuiPageContentBody data-test-subj="appSearchEngines">
          <EngineTable
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
                  <img src={MetaEnginesIcon} alt="" className="engineIcon" />
                  <FormattedMessage
                    id="xpack.enterpriseSearch.appSearch.enginesOverview.metaEngines"
                    defaultMessage="Meta Engines"
                  />
                </h2>
              </EuiTitle>
            </EuiPageContentHeader>
            <EuiPageContentBody data-test-subj="appSearchMetaEngines">
              <EngineTable
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
