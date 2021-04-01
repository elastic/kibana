/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { Fragment, useState, useMemo } from 'react';
import type { Query } from '@elastic/eui';
import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
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
import { useLocalSearch, searchIdField } from '../hooks';

import { PackageCard } from './package_card';

interface PackageListProps {
  isLoading?: boolean;
  controls?: ReactNode;
  title: string;
  packages: PackageList;
  showIntegrations?: boolean;
}

export function PackageListGrid({
  isLoading,
  controls,
  title,
  packages,
  showIntegrations = true,
}: PackageListProps) {
  const initialQuery = EuiSearchBar.Query.MATCH_ALL;

  const [query, setQuery] = useState<Query | null>(initialQuery);
  const [searchTerm, setSearchTerm] = useState('');
  const packagesAndIntegrations = useMemo(
    () =>
      showIntegrations
        ? packages.reduce((acc: PackageList, pkg) => {
            return [
              ...acc,
              pkg,
              ...(pkg.policy_templates?.length
                ? pkg.policy_templates.map((integration) => {
                    const { name, title: integrationTitle, description, icons } = integration;
                    return {
                      ...pkg,
                      title: integrationTitle,
                      description,
                      integration: name,
                      icons: icons || pkg.icons,
                    };
                  })
                : []),
            ];
          }, [])
        : packages,
    [packages, showIntegrations]
  );
  const localSearchRef = useLocalSearch(packagesAndIntegrations);

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

  const controlsContent = useMemo(() => <ControlsColumn title={title} controls={controls} />, [
    controls,
    title,
  ]);

  const filteredPackages = useMemo(
    () =>
      !isLoading && searchTerm
        ? packagesAndIntegrations.filter((pkg) =>
            (localSearchRef.current!.search(searchTerm) as PackageList)
              .map((match) => match[searchIdField])
              .includes(pkg[searchIdField])
          )
        : packagesAndIntegrations,
    [isLoading, localSearchRef, packagesAndIntegrations, searchTerm]
  );

  const gridContent = useMemo(() => {
    if (isLoading || !localSearchRef.current) {
      return <Loading />;
    }
    return <GridColumn packages={filteredPackages} />;
  }, [filteredPackages, isLoading, localSearchRef]);

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
}

function GridColumn({ packages }: GridColumnProps) {
  return (
    <EuiFlexGrid gutterSize="l" columns={3}>
      {packages.length ? (
        packages.map((pkg, i) => {
          return (
            <EuiFlexItem key={i}>
              <PackageCard {...pkg} />
            </EuiFlexItem>
          );
        })
      ) : (
        <EuiFlexItem>
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.fleet.epmList.noPackagesFoundPlaceholder"
                defaultMessage="No packages found"
              />
            </p>
          </EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGrid>
  );
}
