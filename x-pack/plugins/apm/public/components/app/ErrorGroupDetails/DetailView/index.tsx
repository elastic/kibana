/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonEmpty,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiTitle
} from '@elastic/eui';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import { i18n } from '@kbn/i18n';
import { Location } from 'history';
import { get } from 'lodash';
import React from 'react';
import { RRRRenderResponse } from 'react-redux-request';
import styled from 'styled-components';
import { idx } from 'x-pack/plugins/apm/common/idx';
import {
  fromQuery,
  history,
  toQuery
} from 'x-pack/plugins/apm/public/components/shared/Links/url_helpers';
import { STATUS } from 'x-pack/plugins/apm/public/constants';
import { IUrlParams } from 'x-pack/plugins/apm/public/store/urlParams';
import { ErrorGroupAPIResponse } from 'x-pack/plugins/apm/server/lib/errors/get_error_group';
import { APMError } from 'x-pack/plugins/apm/typings/es_schemas/Error';
import { borderRadius, px, unit, units } from '../../../../style/variables';
import { DiscoverErrorLink } from '../../../shared/Links/DiscoverLinks/DiscoverErrorLink';
import { PropertiesTable } from '../../../shared/PropertiesTable';
import { getCurrentTab } from '../../../shared/PropertiesTable/tabConfig';
import { Stacktrace } from '../../../shared/Stacktrace';
import {
  ErrorTab,
  exceptionStacktraceTab,
  getTabs,
  logStacktraceTab
} from './ErrorTabs';
import { StickyErrorProperties } from './StickyErrorProperties';

const PaddedContainer = styled.div`
  padding: ${px(units.plus)} ${px(units.plus)} 0;
`;

const Container = styled.div`
  position: relative;
  border: 1px solid ${theme.euiColorLightShade};
  border-radius: ${borderRadius};
  margin-top: ${px(units.plus)};
`;

const HeaderContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: ${px(units.plus)} ${px(units.plus)} 0;
  margin-bottom: ${px(unit)};
`;

interface Props {
  errorGroup: RRRRenderResponse<ErrorGroupAPIResponse>;
  urlParams: IUrlParams;
  location: Location;
}

export function DetailView({ errorGroup, urlParams, location }: Props) {
  if (errorGroup.status !== STATUS.SUCCESS) {
    return null;
  }
  const { transaction, error, occurrencesCount } = errorGroup.data;

  if (!error) {
    return null;
  }

  const tabs = getTabs(error);
  const currentTab = getCurrentTab(tabs, urlParams.detailTab);

  return (
    <Container>
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

      <PaddedContainer>
        <StickyErrorProperties error={error} transaction={transaction} />
      </PaddedContainer>

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

      <PaddedContainer>
        <TabContent error={error} currentTab={currentTab} />
      </PaddedContainer>
    </Container>
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
  const agentName = error.agent.name;
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
      const propData = get(error, currentTab.key);
      return (
        <PropertiesTable
          propData={propData}
          propKey={currentTab.key}
          agentName={agentName}
        />
      );
  }
}
