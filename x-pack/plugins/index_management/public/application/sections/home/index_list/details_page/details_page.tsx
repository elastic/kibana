/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { Redirect, RouteComponentProps } from 'react-router-dom';
import { Route, Routes } from '@kbn/shared-ux-router';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiPageHeader,
  EuiSpacer,
  EuiPageHeaderProps,
  EuiPageSection,
  EuiButton,
} from '@elastic/eui';
import { SectionLoading } from '@kbn/es-ui-shared-plugin/public';
import { DiscoverLink } from '../../../../lib/discover_link';
import { useLoadIndex } from '../../../../services';
import { Section } from '../../home';
import { DetailsPageError } from './details_page_error';
import { IndexActionsContextMenuWithoutRedux } from '../index_actions_context_menu/index_actions_context_menu.without_redux';
export enum IndexDetailsSection {
  Overview = 'overview',
  Documents = 'documents',
  Mappings = 'mappings',
  Settings = 'settings',
  Pipelines = 'pipelines',
}
const tabs = [
  {
    id: IndexDetailsSection.Overview,
    name: (
      <FormattedMessage id="xpack.idxMgmt.indexDetails.overviewTitle" defaultMessage="Overview" />
    ),
  },
  {
    id: IndexDetailsSection.Documents,
    name: (
      <FormattedMessage id="xpack.idxMgmt.indexDetails.documentsTitle" defaultMessage="Documents" />
    ),
  },
  {
    id: IndexDetailsSection.Mappings,
    name: (
      <FormattedMessage id="xpack.idxMgmt.indexDetails.mappingsTitle" defaultMessage="Mappings" />
    ),
  },
  {
    id: IndexDetailsSection.Settings,
    name: (
      <FormattedMessage id="xpack.idxMgmt.indexDetails.settingsTitle" defaultMessage="Settings" />
    ),
  },
  {
    id: IndexDetailsSection.Pipelines,
    name: (
      <FormattedMessage id="xpack.idxMgmt.indexDetails.pipelinesTitle" defaultMessage="Pipelines" />
    ),
  },
];
export const DetailsPage: React.FunctionComponent<
  RouteComponentProps<{ indexName: string; indexDetailsSection: IndexDetailsSection }>
> = ({
  match: {
    params: { indexName, indexDetailsSection },
  },
  history,
}) => {
  const onSectionChange = useCallback(
    (newSection: IndexDetailsSection) => {
      return history.push(encodeURI(`/indices/${indexName}/${newSection}`));
    },
    [history, indexName]
  );

  const headerTabs = useMemo<EuiPageHeaderProps['tabs']>(() => {
    return tabs.map((tab) => ({
      onClick: () => onSectionChange(tab.id),
      isSelected: tab.id === indexDetailsSection,
      key: tab.id,
      'data-test-subj': `indexDetailsTab-${tab.id}`,
      label: tab.name,
    }));
  }, [indexDetailsSection, onSectionChange]);

  const { isLoading, error, resendRequest, data } = useLoadIndex(indexName);
  if (isLoading) {
    return (
      <SectionLoading>
        <FormattedMessage
          id="xpack.idxMgmt.indexDetails.loadingDescription"
          defaultMessage="Loading index details…"
        />
      </SectionLoading>
    );
  }
  if (error || !data) {
    return <DetailsPageError indexName={indexName} resendRequest={resendRequest} />;
  }

  return (
    <>
      <EuiPageSection paddingSize="none">
        <EuiButton
          data-test-subj="indexDetailsBackToIndicesButton"
          color="text"
          iconType="arrowLeft"
          onClick={() => {
            return history.push(`/${Section.Indices}`);
          }}
        >
          <FormattedMessage
            id="xpack.idxMgmt.indexDetails.backToIndicesButtonLabel"
            defaultMessage="Back to all indices"
          />
        </EuiButton>
      </EuiPageSection>

      <EuiSpacer size="l" />

      <EuiPageHeader
        data-test-subj="indexDetailsHeader"
        pageTitle={indexName}
        bottomBorder
        rightSideItems={[
          <DiscoverLink indexName={indexName} asButton={true} />,
          <IndexActionsContextMenuWithoutRedux
            indexNames={[indexName]}
            indices={[data]}
            fill={false}
          />,
        ]}
        tabs={headerTabs}
      />

      <EuiSpacer size="l" />

      <div data-test-subj={`indexDetailsContent`}>
        <Routes>
          <Route
            path={`/${Section.Indices}/${indexName}/${IndexDetailsSection.Overview}`}
            render={() => <div>Overview</div>}
          />
          <Route
            path={`/${Section.Indices}/${indexName}/${IndexDetailsSection.Documents}`}
            render={() => <div>Documents</div>}
          />
          <Route
            path={`/${Section.Indices}/${indexName}/${IndexDetailsSection.Mappings}`}
            render={() => <div>Mappings</div>}
          />
          <Route
            path={`/${Section.Indices}/${indexName}/${IndexDetailsSection.Settings}`}
            render={() => <div>Settings</div>}
          />
          <Route
            path={`/${Section.Indices}/${indexName}/${IndexDetailsSection.Pipelines}`}
            render={() => <div>Pipelines</div>}
          />
          <Redirect
            from={`/${Section.Indices}/${indexName}`}
            to={`/${Section.Indices}/${indexName}/${IndexDetailsSection.Overview}`}
          />
        </Routes>
      </div>
    </>
  );
};
