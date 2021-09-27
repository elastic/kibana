/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { Fragment, useCallback, useState } from 'react';
import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiTitle,
  // @ts-ignore
  EuiSearchBar,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { useStartServices } from '../../../../../hooks';
import { Loading } from '../../../components';
import { useLocalSearch, searchIdField } from '../../../hooks';

import type { IntegrationCardItem } from '../../../../../../common/types/models';

import { PackageCard } from './package_card';

export interface ListProps {
  isLoading?: boolean;
  controls?: ReactNode;
  title: string;
  list: IntegrationCardItem[];
  initialSearch?: string;
  setSelectedCategory: (category: string) => void;
  onSearchChange: (search: string) => void;
  showMissingIntegrationMessage?: boolean;
}

export function PackageListGrid({
  isLoading,
  controls,
  title,
  list,
  initialSearch,
  onSearchChange,
  setSelectedCategory,
  showMissingIntegrationMessage = false,
}: ListProps) {
  const [searchTerm, setSearchTerm] = useState(initialSearch || '');
  const localSearchRef = useLocalSearch(list);

  const onQueryChange = ({
    queryText: userInput,
    error,
  }: {
    queryText: string;
    error: { message: string } | null;
  }) => {
    if (!error) {
      onSearchChange(userInput);
      setSearchTerm(userInput);
    }
  };

  const resetQuery = () => {
    setSearchTerm('');
  };

  const controlsContent = <ControlsColumn title={title} controls={controls} />;
  let gridContent: JSX.Element;

  if (isLoading || !localSearchRef.current) {
    gridContent = <Loading />;
  } else {
    const filteredList = searchTerm
      ? list.filter((item) =>
          (localSearchRef.current!.search(searchTerm) as IntegrationCardItem[])
            .map((match) => match[searchIdField])
            .includes(item[searchIdField])
        )
      : list;
    gridContent = (
      <GridColumn
        list={filteredList}
        showMissingIntegrationMessage={showMissingIntegrationMessage}
      />
    );
  }

  return (
    <EuiFlexGroup alignItems="flexStart">
      <EuiFlexItem grow={1}>{controlsContent}</EuiFlexItem>
      <EuiFlexItem grow={3}>
        <EuiSearchBar
          query={searchTerm || undefined}
          box={{
            placeholder: i18n.translate('xpack.fleet.epmList.searchPackagesPlaceholder', {
              defaultMessage: 'Search for integrations',
            }),
            incremental: true,
          }}
          onChange={onQueryChange}
        />
        <EuiSpacer />
        {gridContent}
        {showMissingIntegrationMessage && (
          <>
            <EuiSpacer size="xxl" />
            <MissingIntegrationContent
              resetQuery={resetQuery}
              setSelectedCategory={setSelectedCategory}
            />
          </>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

interface ControlsColumnProps {
  controls: ReactNode;
  title: string;
}

function ControlsColumn({ controls, title }: ControlsColumnProps) {
  return (
    <Fragment>
      <EuiTitle size="s">
        <h2>{title}</h2>
      </EuiTitle>
      <EuiSpacer size="l" />
      <EuiFlexGroup>
        <EuiFlexItem grow={4}>{controls}</EuiFlexItem>
        <EuiFlexItem grow={1} />
      </EuiFlexGroup>
    </Fragment>
  );
}

interface GridColumnProps {
  list: IntegrationCardItem[];
  showMissingIntegrationMessage?: boolean;
}

function GridColumn({ list, showMissingIntegrationMessage = false }: GridColumnProps) {
  return (
    <EuiFlexGrid gutterSize="l" columns={3}>
      {list.length ? (
        list.map((item) => {
          return (
            <EuiFlexItem key={item.id}>
              <PackageCard {...item} />
            </EuiFlexItem>
          );
        })
      ) : (
        <EuiFlexItem grow={3}>
          <EuiText>
            <p>
              {showMissingIntegrationMessage ? (
                <FormattedMessage
                  id="xpack.fleet.epmList.missingIntegrationPlaceholder"
                  defaultMessage="We didn't find any integrations matching your search term. Please try another keyword or browse using the categories on the left."
                />
              ) : (
                <FormattedMessage
                  id="xpack.fleet.epmList.noPackagesFoundPlaceholder"
                  defaultMessage="No packages found"
                />
              )}
            </p>
          </EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGrid>
  );
}

interface MissingIntegrationContentProps {
  resetQuery: () => void;
  setSelectedCategory: (category: string) => void;
}

function MissingIntegrationContent({
  resetQuery,
  setSelectedCategory,
}: MissingIntegrationContentProps) {
  const {
    application: { getUrlForApp },
  } = useStartServices();
  const handleCustomInputsLinkClick = useCallback(() => {
    resetQuery();
    setSelectedCategory('custom');
  }, [resetQuery, setSelectedCategory]);

  return (
    <EuiText>
      <p>
        <FormattedMessage
          id="xpack.fleet.integrations.missing"
          defaultMessage="Don't see an integration? Collect any logs or metrics using our {customInputsLink}, or add data using {beatsTutorialLink}. Request new integrations using our {discussForumLink}."
          values={{
            customInputsLink: (
              <EuiLink onClick={handleCustomInputsLinkClick}>
                <FormattedMessage
                  id="xpack.fleet.integrations.customInputsLink"
                  defaultMessage="custom inputs"
                />
              </EuiLink>
            ),
            discussForumLink: (
              <EuiLink href="https://discuss.elastic.co/tag/fleet" external target="_blank">
                <FormattedMessage
                  id="xpack.fleet.integrations.discussForumLink"
                  defaultMessage="discuss forum"
                />
              </EuiLink>
            ),
            beatsTutorialLink: (
              <EuiLink href={getUrlForApp('home', { path: '#/tutorial_directory' })}>
                <FormattedMessage
                  id="xpack.fleet.integrations.beatsModulesLink"
                  defaultMessage="Beats modules"
                />
              </EuiLink>
            ),
          }}
        />
      </p>
    </EuiText>
  );
}
