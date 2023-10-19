/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState, FunctionComponent } from 'react';
import { css } from '@emotion/react';
import { RouteComponentProps } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiPageHeader,
  EuiSpacer,
  EuiPageHeaderProps,
  EuiPageSection,
  EuiButton,
  EuiPageTemplate,
  EuiText,
  EuiCode,
} from '@elastic/eui';
import { SectionLoading } from '@kbn/es-ui-shared-plugin/public';

import { Section, IndexDetailsSection } from '../../../../../../common/constants';
import { getIndexDetailsLink } from '../../../../services/routing';
import { Index } from '../../../../../../common';
import { INDEX_OPEN } from '../../../../../../common/constants';
import { Error } from '../../../../../shared_imports';
import { loadIndex } from '../../../../services';
import { useAppContext } from '../../../../app_context';
import { DiscoverLink } from '../../../../lib/discover_link';
import { DetailsPageError } from './details_page_error';
import { ManageIndexButton } from './manage_index_button';
import { DetailsPageStats } from './details_page_stats';
import { DetailsPageMappings } from './details_page_mappings';
import { DetailsPageOverview } from './details_page_overview';
import { DetailsPageSettings } from './details_page_settings';

const defaultTabs = [
  {
    id: IndexDetailsSection.Overview,
    name: (
      <FormattedMessage id="xpack.idxMgmt.indexDetails.overviewTitle" defaultMessage="Overview" />
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
];

const statsTab = {
  id: IndexDetailsSection.Stats,
  name: <FormattedMessage id="xpack.idxMgmt.indexDetails.statsTitle" defaultMessage="Statistics" />,
};

const getSelectedTabContent = ({
  tab,
  index,
  indexName,
}: {
  tab: IndexDetailsSection;
  index?: Index | null;
  indexName: string;
}) => {
  // if there is no index data, the tab content won't be rendered, so it's safe to return null here
  if (!index) {
    return null;
  }
  switch (tab) {
    case IndexDetailsSection.Overview:
      return <DetailsPageOverview indexDetails={index} />;
    case IndexDetailsSection.Mappings:
      return <DetailsPageMappings indexName={indexName} />;
    case IndexDetailsSection.Settings:
      return (
        <DetailsPageSettings indexName={indexName} isIndexOpen={index.status === INDEX_OPEN} />
      );
    case IndexDetailsSection.Stats:
      return <DetailsPageStats indexName={indexName} isIndexOpen={index.status === INDEX_OPEN} />;
    default:
      return <DetailsPageOverview indexDetails={index} />;
  }
};
export const DetailsPage: FunctionComponent<
  RouteComponentProps<{ indexName: string; indexDetailsSection: IndexDetailsSection }>
> = ({ location: { search }, history }) => {
  const { config } = useAppContext();
  const queryParams = useMemo(() => new URLSearchParams(search), [search]);
  const indexName = queryParams.get('indexName') ?? '';
  const tab = queryParams.get('tab') ?? IndexDetailsSection.Overview;
  let indexDetailsSection = IndexDetailsSection.Overview;
  if (Object.values(IndexDetailsSection).includes(tab as IndexDetailsSection)) {
    indexDetailsSection = tab as IndexDetailsSection;
  }

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [index, setIndex] = useState<Index | null>();
  const selectedTabContent = useMemo(() => {
    return getSelectedTabContent({ tab: indexDetailsSection, index, indexName });
  }, [index, indexDetailsSection, indexName]);
  const fetchIndexDetails = useCallback(async () => {
    if (indexName) {
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
    }
  }, [indexName]);

  useEffect(() => {
    fetchIndexDetails();
  }, [fetchIndexDetails]);

  const onSectionChange = useCallback(
    (newSection: IndexDetailsSection) => {
      return history.push(getIndexDetailsLink(indexName, newSection));
    },
    [history, indexName]
  );

  const navigateToAllIndices = useCallback(() => {
    history.push(`/${Section.Indices}`);
  }, [history]);

  const headerTabs = useMemo<EuiPageHeaderProps['tabs']>(() => {
    const visibleTabs = config.enableIndexStats ? [...defaultTabs, statsTab] : defaultTabs;

    return visibleTabs.map((visibleTab) => ({
      onClick: () => onSectionChange(visibleTab.id),
      isSelected: visibleTab.id === indexDetailsSection,
      key: visibleTab.id,
      'data-test-subj': `indexDetailsTab-${visibleTab.id}`,
      label: visibleTab.name,
    }));
  }, [indexDetailsSection, onSectionChange, config]);

  if (!indexName) {
    return (
      <EuiPageTemplate.EmptyPrompt
        data-test-subj="indexDetailsNoIndexNameError"
        color="danger"
        iconType="warning"
        title={
          <h2>
            <FormattedMessage
              id="xpack.idxMgmt.indexDetails.noIndexNameErrorTitle"
              defaultMessage="Unable to load index details"
            />
          </h2>
        }
        body={
          <EuiText color="subdued">
            <FormattedMessage
              id="xpack.idxMgmt.indexDetails.noIndexNameErrorDescription"
              defaultMessage="An index name is required for this page. Add a query parameter {queryParam} followed by an index name to the url."
              values={{
                queryParam: <EuiCode>indexName</EuiCode>,
              }}
            />
          </EuiText>
        }
      />
    );
  }
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

      <div
        data-test-subj={`indexDetailsContent`}
        css={css`
          height: 100%;
        `}
      >
        {selectedTabContent}
      </div>
    </>
  );
};
