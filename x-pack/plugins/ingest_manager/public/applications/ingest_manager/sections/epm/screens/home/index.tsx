/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiHorizontalRule, EuiPage, EuiPageBody, EuiSpacer } from '@elastic/eui';
import React, { Fragment, useState } from 'react';
import styled from 'styled-components';
// import { PLUGIN } from '../../../common/constants';
import { CategorySummaryItem, PackageList } from '../../../../types';
import { PackageListGrid } from '../../components/package_list_grid';
// import { useBreadcrumbs, useLinks } from '../../hooks';
import { CategoryFacets } from './category_facets';
import { Header } from './header';
import { useAllPackages, useInstalledPackages, useLocalSearch } from './hooks';
import { useGetCategories, useGetPackages } from '../../../../hooks';
import { SearchPackages } from './search_packages';

export const FullBleedPage = styled(EuiPage)`
  padding: 0;
`;

export function Home() {
  const maxContentWidth = 1200;
  // useBreadcrumbs([{ text: PLUGIN.TITLE, href: toListView() }]);

  const state = useHomeState();
  const body = state.searchTerm ? (
    <SearchPackages
      searchTerm={state.searchTerm}
      localSearchRef={state.localSearchRef}
      allPackages={state.allPackages}
    />
  ) : (
    <Fragment>
      {state.installedPackages.length ? (
        <Fragment>
          <InstalledPackages list={state.installedPackages} />
          <EuiHorizontalRule margin="xxl" />
        </Fragment>
      ) : null}
      <AvailablePackages {...state} />
    </Fragment>
  );

  return (
    <Fragment>
      <Header restrictWidth={maxContentWidth} onSearch={state.setSearchTerm} />
      <EuiHorizontalRule margin="none" />
      <EuiSpacer size="xxl" />
      <FullBleedPage>
        <EuiPageBody restrictWidth={maxContentWidth}>{body}</EuiPageBody>
      </FullBleedPage>
    </Fragment>
  );
}

type HomeState = ReturnType<typeof useHomeState>;

export function useHomeState() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const { data: categoriesRes } = useGetCategories();
  const categories = categoriesRes?.response;
  const { data: categoryPackagesRes } = useGetPackages({ category: selectedCategory });
  const categoryPackages = categoryPackagesRes?.response;
  const [allPackages, setAllPackages] = useAllPackages(selectedCategory, categoryPackages);
  const localSearchRef = useLocalSearch(allPackages);
  const [installedPackages, setInstalledPackages] = useInstalledPackages(allPackages);

  return {
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    categories,
    allPackages,
    setAllPackages,
    installedPackages,
    localSearchRef,
    setInstalledPackages,
    categoryPackages,
  };
}

function InstalledPackages({ list }: { list: PackageList }) {
  const title = 'Your Packages';

  return <PackageListGrid title={title} list={list} />;
}

function AvailablePackages({
  allPackages,
  categories,
  categoryPackages,
  selectedCategory,
  setSelectedCategory,
}: HomeState) {
  const title = 'Available Packages';
  const noFilter = {
    id: '',
    title: 'All',
    count: allPackages.length,
  };

  const controls = categories ? (
    <CategoryFacets
      categories={[noFilter, ...categories]}
      selectedCategory={selectedCategory}
      onCategoryChange={({ id }: CategorySummaryItem) => setSelectedCategory(id)}
    />
  ) : null;

  return <PackageListGrid title={title} controls={controls} list={categoryPackages || []} />;
}
