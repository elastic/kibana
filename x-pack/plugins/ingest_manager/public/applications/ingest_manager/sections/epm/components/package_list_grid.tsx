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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { Loading } from '../../../components';
import { PackageList } from '../../../types';
import { useLocalSearch, searchIdField } from '../hooks';
import { BadgeProps, PackageCard } from './package_card';

type ListProps = {
  isLoading?: boolean;
  controls?: ReactNode;
  title: string;
  list: PackageList;
} & BadgeProps;

export function PackageListGrid({
  isLoading,
  controls,
  title,
  list,
  showInstalledBadge,
}: ListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const localSearchRef = useLocalSearch(list);

  const controlsContent = <ControlsColumn title={title} controls={controls} />;
  let gridContent: JSX.Element;

  if (isLoading || !localSearchRef.current) {
    gridContent = <Loading />;
  } else {
    const filteredList = searchTerm
      ? list.filter(item =>
          (localSearchRef.current!.search(searchTerm) as PackageList)
            .map(match => match[searchIdField])
            .includes(item[searchIdField])
        )
      : list;
    gridContent = <GridColumn list={filteredList} showInstalledBadge={showInstalledBadge} />;
  }

  return (
    <EuiFlexGroup alignItems="flexStart">
      <EuiFlexItem grow={1}>{controlsContent}</EuiFlexItem>
      <EuiFlexItem grow={3}>
        <EuiSearchBar
          query={searchTerm}
          box={{
            placeholder: i18n.translate('xpack.ingestManager.epmList.searchPackagesPlaceholder', {
              defaultMessage: 'Search for a package',
            }),
            incremental: true,
          }}
          onChange={({ queryText: userInput }: { queryText: string }) => {
            setSearchTerm(userInput);
          }}
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
        <EuiFlexItem grow={2}>{controls}</EuiFlexItem>
        <EuiFlexItem grow={1} />
      </EuiFlexGroup>
    </Fragment>
  );
}

type GridColumnProps = {
  list: PackageList;
} & BadgeProps;

function GridColumn({ list }: GridColumnProps) {
  return (
    <EuiFlexGrid gutterSize="l" columns={3}>
      {list.length ? (
        list.map(item => (
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
