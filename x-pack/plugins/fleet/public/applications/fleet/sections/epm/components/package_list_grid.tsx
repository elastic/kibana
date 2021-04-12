/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { Fragment, useCallback, useState } from 'react';
import type { Query } from '@elastic/eui';
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

import { Loading } from '../../../components';
import type { PackageList } from '../../../types';
import { useLocalSearch } from '../hooks';

import { PackageCard } from './package_card';

interface PackageListProps {
  isLoading?: boolean;
  controls?: ReactNode;
  title: string;
  list: PackageList;
  setSelectedCategory?: (category: string) => void;
  showMissingIntegrationMessage?: boolean;
}

export function PackageListGrid({
  isLoading,
  controls,
  title,
  list = [],
  setSelectedCategory = () => {},
  showMissingIntegrationMessage = false,
}: PackageListProps) {
  const initialQuery = EuiSearchBar.Query.MATCH_ALL;

  const [query, setQuery] = useState<Query | null>(initialQuery);
  const [searchTerm, setSearchTerm] = useState('');
  const localSearchRef = useLocalSearch(list);

  const onQueryChange = ({
    // eslint-disable-next-line @typescript-eslint/no-shadow
    query,
    queryText: userInput,
    error,
  }: {
    query: Query | null;
    queryText: string;
    error: { message: string } | null;
  }) => {
    if (!error) {
      setQuery(query);
      setSearchTerm(userInput);
    }
  };

  const resetQuery = () => {
    setQuery(initialQuery);
    setSearchTerm('');
  };

  const controlsContent = <ControlsColumn title={title} controls={controls} />;
  let gridContent: JSX.Element;

  if (isLoading || !localSearchRef.current) {
    gridContent = <Loading />;
  } else {
    const filteredList = searchTerm
      ? list.filter((item) => localSearchRef.current!.search(searchTerm) as PackageList)
      : list;
    gridContent = (
      <GridColumn
        packages={filteredList}
        showMissingIntegrationMessage={showMissingIntegrationMessage}
      />
    );
  }

  return (
    <EuiFlexGroup alignItems="flexStart">
      <EuiFlexItem grow={1}>{controlsContent}</EuiFlexItem>
      <EuiFlexItem grow={3}>
        <EuiSearchBar
          query={query || undefined}
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
  packages: PackageList;
  showMissingIntegrationMessage?: boolean;
}

function GridColumn({ packages, showMissingIntegrationMessage = false }: GridColumnProps) {
  return (
    <EuiFlexGrid gutterSize="l" columns={3}>
      {packages.length ? (
        packages.map((pkg) => {
          return (
            <EuiFlexItem key={pkg.id}>
              <PackageCard {...pkg} />
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
  const handleCustomInputsLinkClick = useCallback(() => {
    resetQuery();
    setSelectedCategory('custom');
  }, [resetQuery, setSelectedCategory]);

  return (
    <EuiText>
      <p>
        <FormattedMessage
          id="xpack.fleet.integrations.missing"
          defaultMessage="Don't see an integration? Collect any logs or metrics using our {customInputsLink}. Request new integrations using our {discussForumLink}."
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
          }}
        />
      </p>
    </EuiText>
  );
}
