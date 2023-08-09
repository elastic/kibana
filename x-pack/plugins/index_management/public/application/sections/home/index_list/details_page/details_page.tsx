/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { Redirect, RouteComponentProps } from 'react-router-dom';
import { Route, Routes } from '@kbn/shared-ux-router';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiPageHeader, EuiSpacer } from '@elastic/eui';
import { useAppContext } from '../../../../app_context';
import { Section } from '../../home';

enum IndexDetailsSection {
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
}) => {
  const { history } = useAppContext();
  const onSectionChange = useCallback(
    (newSection: IndexDetailsSection) => {
      return history.push(encodeURI(`/indices/${indexName}/${newSection}`));
    },
    [history, indexName]
  );
  return (
    <>
      <EuiPageHeader
        pageTitle={indexName}
        bottomBorder
        rightSideItems={[]}
        tabs={tabs.map((tab) => ({
          onClick: () => onSectionChange(tab.id),
          // isSelected: tab.id === section,
          key: tab.id,
          // 'data-test-subj': `${tab.id}Tab`,
          label: tab.name,
        }))}
      />

      <EuiSpacer size="l" />

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
    </>
  );
};
