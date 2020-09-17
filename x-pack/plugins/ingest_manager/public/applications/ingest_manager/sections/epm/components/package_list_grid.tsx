/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, ReactNode, useState } from 'react';
import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  // @ts-ignore
  EuiSearchBar,
  EuiText,
  Query,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { Loading } from '../../../components';
import { PackageList } from '../../../types';
import { useLocalSearch, searchIdField } from '../hooks';
import { PackageCard } from './package_card';

interface ListProps {
  isLoading?: boolean;
  controls?: ReactNode;
  title: string;
  list: PackageList;
}

export function PackageListGrid({ isLoading, controls, title, list }: ListProps) {
  const initialQuery = EuiSearchBar.Query.MATCH_ALL;

  const [query, setQuery] = useState<Query | null>(initialQuery);
  const [searchTerm, setSearchTerm] = useState('');
  const localSearchRef = useLocalSearch(list);

  const onQueryChange = ({
    // eslint-disable-next-line no-shadow
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

  const controlsContent = <ControlsColumn title={title} controls={controls} />;
  let gridContent: JSX.Element;

  if (isLoading || !localSearchRef.current) {
    gridContent = <Loading />;
  } else {
    const filteredList = searchTerm
      ? list.filter((item) =>
          (localSearchRef.current!.search(searchTerm) as PackageList)
            .map((match) => match[searchIdField])
            .includes(item[searchIdField])
        )
      : list;
    gridContent = <GridColumn list={filteredList} />;
  }

  return (
    <EuiFlexGroup alignItems="flexStart">
      <EuiFlexItem grow={1}>{controlsContent}</EuiFlexItem>
      <EuiFlexItem grow={3}>
        <EuiSearchBar
          query={query || undefined}
          box={{
            placeholder: i18n.translate('xpack.ingestManager.epmList.searchPackagesPlaceholder', {
              defaultMessage: 'Search for integrations',
            }),
            incremental: true,
          }}
          onChange={onQueryChange}
        />
        <EuiSpacer />
        {gridContent}
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
  list: PackageList;
}

function GridColumn({ list }: GridColumnProps) {
  return (
    <EuiFlexGrid gutterSize="l" columns={3}>
      {list.length ? (
        list.map((item) => (
          <EuiFlexItem key={`${item.name}-${item.version}`}>
            <PackageCard {...item} />
          </EuiFlexItem>
        ))
      ) : (
        <EuiFlexItem>
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.ingestManager.epmList.noPackagesFoundPlaceholder"
                defaultMessage="No packages found"
              />
            </p>
          </EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGrid>
  );
}
