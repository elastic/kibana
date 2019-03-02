/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';
import { pure } from 'recompose';
import chrome from 'ui/chrome';
import { StaticIndexPattern } from 'ui/index_patterns';

import { ESTermQuery } from '../../../common/typed_json';
import { EmptyPage } from '../../components/empty_page';
import { getNetworkUrl, NetworkComponentProps } from '../../components/link_to/redirect_to_network';

import { GlobalTime } from '../../containers/global_time';
import { indicesExistOrDataTemporarilyUnavailable, WithSource } from '../../containers/source';
import { IndexType } from '../../graphql/types';
import { convertKueryToElasticSearchQuery, escapeQueryValue } from '../../lib/keury';
import { networkModel, networkSelectors, State } from '../../store';
import { PageContent, PageContentBody } from '../styles';

import { NetworkKql } from './kql';
import * as i18n from './translations';

const basePath = chrome.getBasePath();
const type = networkModel.NetworkType.details;

interface NetworkDetailsComponentReduxProps {
  filterQueryExpression: string;
}

type NetworkDetailsComponentProps = NetworkDetailsComponentReduxProps & NetworkComponentProps;

const NetworkDetailsComponent = pure<NetworkDetailsComponentProps>(
  ({
    match: {
      params: { ip },
    },
    filterQueryExpression,
  }) => (
    <WithSource sourceId="default" indexTypes={[IndexType.FILEBEAT, IndexType.PACKETBEAT]}>
      {({ filebeatIndicesExist, indexPattern }) =>
        indicesExistOrDataTemporarilyUnavailable(filebeatIndicesExist) ? (
          <>
            <NetworkKql indexPattern={indexPattern} type={networkModel.NetworkType.page} />
            <PageContent data-test-subj="pageContent" panelPaddingSize="none">
              <PageContentBody data-test-subj="pane1ScrollContainer">
                <GlobalTime>{({ poll, to, from, setQuery }) => <>{`Hello ${ip}!`}</>}</GlobalTime>
              </PageContentBody>
            </PageContent>
          </>
        ) : (
          <EmptyPage
            title={i18n.NO_FILEBEAT_INDICES}
            message={i18n.LETS_ADD_SOME}
            actionLabel={i18n.SETUP_INSTRUCTIONS}
            actionUrl={`${basePath}/app/kibana#/home/tutorial_directory/security`}
          />
        )
      }
    </WithSource>
  )
);

const makeMapStateToProps = () => {
  const getNetworkFilterQuery = networkSelectors.networkFilterQueryExpression();
  return (state: State) => ({
    filterQueryExpression: getNetworkFilterQuery(state, type) || '',
  });
};

export const NetworkDetails = connect(makeMapStateToProps)(NetworkDetailsComponent);

export const getBreadcrumbs = (ip: string) => [
  {
    text: i18n.NETWORK,
    href: getNetworkUrl(),
  },
  {
    text: ip,
  },
];

// @ts-ignore
const getFilterQuery = (
  ip: string,
  filterQueryExpression: string,
  indexPattern: StaticIndexPattern
): ESTermQuery | string =>
  isEmpty(filterQueryExpression)
    ? { term: { ip } }
    : convertKueryToElasticSearchQuery(
        `${filterQueryExpression} and ip: ${escapeQueryValue(ip)}`,
        indexPattern
      );
