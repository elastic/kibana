/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

import { Index } from '../../../../../../common';
import { loadIndex } from '../../../../services';
import { DiscoverLink } from '../../../../lib/discover_link';
import { Section } from '../../home';
import { DetailsPageError } from './details_page_error';
import { OverviewTab } from './tabs';
import { ManageIndexButton } from './manage_index_button';

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState();
  const [index, setIndex] = useState<Index | null>();

  const fetchIndexDetails = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error: loadingError } = await loadIndex(indexName);
      setIsLoading(false);
      setError(loadingError);
      setIndex(data);
    } catch (e) {
      setIsLoading(false);
      setError(e);
    }
  }, [indexName]);

  useEffect(() => {
    fetchIndexDetails();
  }, [fetchIndexDetails]);

  const onSectionChange = useCallback(
    (newSection: IndexDetailsSection) => {
      return history.push(encodeURI(`/indices/${indexName}/${newSection}`));
    },
    [history, indexName]
  );

  const navigateToAllIndices = useCallback(() => {
    history.push(`/${Section.Indices}`);
  }, [history]);

  const headerTabs = useMemo<EuiPageHeaderProps['tabs']>(() => {
    return tabs.map((tab) => ({
      onClick: () => onSectionChange(tab.id),
      isSelected: tab.id === indexDetailsSection,
      key: tab.id,
      'data-test-subj': `indexDetailsTab-${tab.id}`,
      label: tab.name,
    }));
  }, [indexDetailsSection, onSectionChange]);

  if (isLoading && !index) {
    return (
      <SectionLoading>
        <FormattedMessage
          id="xpack.idxMgmt.indexDetails.loadingDescription"
          defaultMessage="Loading index details…"
        />
      </SectionLoading>
    );
  }
  if (error || !index) {
    return <DetailsPageError indexName={indexName} resendRequest={fetchIndexDetails} />;
  }

  return (
    <>
      <EuiPageSection paddingSize="none">
        <EuiButton
          data-test-subj="indexDetailsBackToIndicesButton"
          color="text"
          iconType="arrowLeft"
          onClick={navigateToAllIndices}
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
          <ManageIndexButton
            indexName={indexName}
            indexDetails={index}
            reloadIndexDetails={fetchIndexDetails}
            navigateToAllIndices={navigateToAllIndices}
          />,
        ]}
        tabs={headerTabs}
      />

      <EuiSpacer size="l" />

      <div data-test-subj={`indexDetailsContent`}>
        <Routes>
          <Route
            path={`/${Section.Indices}/${indexName}/${IndexDetailsSection.Overview}`}
            render={() => <OverviewTab indexDetails={index} />}
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
