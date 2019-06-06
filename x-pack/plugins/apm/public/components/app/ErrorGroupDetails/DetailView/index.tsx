/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonEmpty,
  EuiPanel,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiTitle
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Location } from 'history';
import React from 'react';
import styled from 'styled-components';
import { first } from 'lodash';
import { idx } from '@kbn/elastic-idx';
import { ErrorGroupAPIResponse } from '../../../../../server/lib/errors/get_error_group';
import { APMError } from '../../../../../typings/es_schemas/ui/APMError';
import { IUrlParams } from '../../../../context/UrlParamsContext/types';
import { px, unit } from '../../../../style/variables';
import { DiscoverErrorLink } from '../../../shared/Links/DiscoverLinks/DiscoverErrorLink';
import { fromQuery, toQuery } from '../../../shared/Links/url_helpers';
import { history } from '../../../../utils/history';
import { ErrorMetadata } from '../../../shared/MetadataTable/ErrorMetadata';
import { Stacktrace } from '../../../shared/Stacktrace';
import {
  ErrorTab,
  exceptionStacktraceTab,
  getTabs,
  logStacktraceTab
} from './ErrorTabs';
import { StickyErrorProperties } from './StickyErrorProperties';

const HeaderContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${px(unit)};
`;

interface Props {
  errorGroup: ErrorGroupAPIResponse;
  urlParams: IUrlParams;
  location: Location;
}

// TODO: Move query-string-based tabs into a re-usable component?
function getCurrentTab(
  tabs: ErrorTab[] = [],
  currentTabKey: string | undefined
) {
  const selectedTab = tabs.find(({ key }) => key === currentTabKey);
  return selectedTab ? selectedTab : first(tabs) || {};
}

export function DetailView({ errorGroup, urlParams, location }: Props) {
  const { transaction, error, occurrencesCount } = errorGroup;

  if (!error) {
    return null;
  }

  const tabs = getTabs(error);
  const currentTab = getCurrentTab(tabs, urlParams.detailTab);

  return (
    <EuiPanel>
      <HeaderContainer>
        <EuiTitle size="s">
          <h3>
            {i18n.translate(
              'xpack.apm.errorGroupDetails.errorOccurrenceTitle',
              {
                defaultMessage: 'Error occurrence'
              }
            )}
          </h3>
        </EuiTitle>
        <DiscoverErrorLink error={error} kuery={urlParams.kuery}>
          <EuiButtonEmpty iconType="discoverApp">
            {i18n.translate(
              'xpack.apm.errorGroupDetails.viewOccurrencesInDiscoverButtonLabel',
              {
                defaultMessage:
                  'View {occurrencesCount} occurrences in Discover',
                values: { occurrencesCount }
              }
            )}
          </EuiButtonEmpty>
        </DiscoverErrorLink>
      </HeaderContainer>

      <StickyErrorProperties error={error} transaction={transaction} />

      <EuiSpacer />

      <EuiTabs>
        {tabs.map(({ key, label }) => {
          return (
            <EuiTab
              onClick={() => {
                history.replace({
                  ...location,
                  search: fromQuery({
                    ...toQuery(location.search),
                    detailTab: key
                  })
                });
              }}
              isSelected={currentTab.key === key}
              key={key}
            >
              {label}
            </EuiTab>
          );
        })}
      </EuiTabs>
      <EuiSpacer />
      <TabContent error={error} currentTab={currentTab} />
    </EuiPanel>
  );
}

export function TabContent({
  error,
  currentTab
}: {
  error: APMError;
  currentTab: ErrorTab;
}) {
  const codeLanguage = error.service.name;
  const excStackframes = idx(error, _ => _.error.exception[0].stacktrace);
  const logStackframes = idx(error, _ => _.error.exception[0].stacktrace);

  switch (currentTab.key) {
    case logStacktraceTab.key:
      return (
        <Stacktrace stackframes={logStackframes} codeLanguage={codeLanguage} />
      );
    case exceptionStacktraceTab.key:
      return (
        <Stacktrace stackframes={excStackframes} codeLanguage={codeLanguage} />
      );
    default:
      return <ErrorMetadata error={error} />;
  }
}
