/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentHeader,
  EuiPageContentBody,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';

import EnginesIcon from '../../assets/engine.svg';
import MetaEnginesIcon from '../../assets/meta_engine.svg';

import { LoadingState, EmptyState, NoUserState, ErrorState } from '../empty_states';
import { EngineOverviewHeader } from '../engine_overview_header';
import { EngineTable } from './engine_table';

import './engine_overview.scss';

interface IEngineOverviewProps {
  appSearchUrl: string;
  showSetupGuideFlag();
  http();
}

export const EngineOverview: ReactFC<IEngineOverviewProps> = ({ http, ...props }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasNoAccount, setHasNoAccount] = useState(false);
  const [hasErrorConnecting, setHasErrorConnecting] = useState(false);

  const [engines, setEngines] = useState([]);
  const [enginesPage, setEnginesPage] = useState(1);
  const [enginesTotal, setEnginesTotal] = useState(0);
  const [metaEngines, setMetaEngines] = useState([]);
  const [metaEnginesPage, setMetaEnginesPage] = useState(1);
  const [metaEnginesTotal, setMetaEnginesTotal] = useState(0);

  const getEnginesData = ({ type, pageIndex }) => {
    return http.get('/api/app_search/engines', {
      query: { type, pageIndex },
    });
  };
  const hasValidData = response => {
    return response && response.results && response.meta;
  };
  const hasNoAccountError = response => {
    return response && response.message === 'no-as-account';
  };
  const setEnginesData = (params, callbacks) => {
    getEnginesData(params)
      .then(response => {
        if (!hasValidData(response)) {
          if (hasNoAccountError(response)) {
            return setHasNoAccount(true);
          }
          throw new Error('App Search engines response is missing valid data');
        }

        callbacks.setResults(response.results);
        callbacks.setResultsTotal(response.meta.page.total_results);
        setIsLoading(false);
      })
      .catch(error => {
        // TODO - should we be logging errors to telemetry or elsewhere for debugging?
        setHasErrorConnecting(true);
      });
  };

  useEffect(() => {
    const params = { type: 'indexed', pageIndex: enginesPage };
    const callbacks = { setResults: setEngines, setResultsTotal: setEnginesTotal };

    setEnginesData(params, callbacks);
  }, [enginesPage]); // eslint-disable-line
  // TODO: https://reactjs.org/docs/hooks-faq.html#is-it-safe-to-omit-functions-from-the-list-of-dependencies

  useEffect(() => {
    const params = { type: 'meta', pageIndex: metaEnginesPage };
    const callbacks = { setResults: setMetaEngines, setResultsTotal: setMetaEnginesTotal };

    setEnginesData(params, callbacks);
  }, [metaEnginesPage]); // eslint-disable-line
  // TODO: https://reactjs.org/docs/hooks-faq.html#is-it-safe-to-omit-functions-from-the-list-of-dependencies

  if (hasErrorConnecting) return <ErrorState {...props} />;
  if (hasNoAccount) return <NoUserState {...props} />;
  if (isLoading) return <LoadingState {...props} />;
  if (!engines.length) return <EmptyState {...props} />;

  return (
    <EuiPage restrictWidth className="engine-overview">
      <EuiPageBody>
        <EngineOverviewHeader appSearchUrl={props.appSearchUrl} />

        <EuiPageContent>
          <EuiPageContentHeader>
            <EuiTitle size="s">
              <h2>
                <img src={EnginesIcon} alt="" className="engine-icon" />
                Engines
              </h2>
            </EuiTitle>
          </EuiPageContentHeader>
          <EuiPageContentBody>
            <EngineTable
              data={engines}
              pagination={{
                totalEngines: enginesTotal,
                pageIndex: enginesPage - 1,
                onPaginate: setEnginesPage,
              }}
              appSearchUrl={props.appSearchUrl}
            />
          </EuiPageContentBody>

          {metaEngines.length > 0 && (
            <>
              <EuiSpacer size="xl" />
              <EuiPageContentHeader>
                <EuiTitle size="s">
                  <h2>
                    <img src={MetaEnginesIcon} alt="" className="engine-icon" />
                    Meta Engines
                  </h2>
                </EuiTitle>
              </EuiPageContentHeader>
              <EuiPageContentBody>
                <EngineTable
                  data={metaEngines}
                  pagination={{
                    totalEngines: metaEnginesTotal,
                    pageIndex: metaEnginesPage - 1,
                    onPaginate: setMetaEnginesPage,
                  }}
                  appSearchUrl={props.appSearchUrl}
                />
              </EuiPageContentBody>
            </>
          )}
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
