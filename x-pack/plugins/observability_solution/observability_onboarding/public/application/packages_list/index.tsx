/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AvailablePackagesHookType,
  IntegrationCardItem,
} from '@kbn/fleet-plugin/public';
import {
  EuiAutoSize,
  EuiAutoSizer,
  EuiPanel,
  EuiSearchBar,
  EuiSkeletonText,
} from '@elastic/eui';
import React, { useEffect, useRef, Suspense, useState } from 'react';
import { PackageList, fetchAvailablePackagesHook } from './lazy';

interface Props {
  /**
   * The inclusive set of card names to display.
   */
  featuredCards?: string[];
  generatedCards?: IntegrationCardItem[];
  selectedCategory?: string;
  showSearchBar?: boolean;
}

type WrapperProps = Props & {
  useAvailablePackages: AvailablePackagesHookType;
};

const Loading = () => (
  <EuiAutoSizer>
    {({ width, height }: EuiAutoSize) => (
      <EuiPanel css={{ height, width }}>
        <EuiSkeletonText isLoading={true} lines={10} />
      </EuiPanel>
    )}
  </EuiAutoSizer>
);

const QUICKSTART_FLOWS = ['kubernetes'];

const PackageListGridWrapper = ({
  selectedCategory = 'observability',
  useAvailablePackages,
  showSearchBar = false,
  featuredCards,
  generatedCards,
}: WrapperProps) => {
  const [integrationSearch, setIntegrationSearch] = useState('');
  const [initialHidden, setInitialHidden] = useState(showSearchBar);
  const availablePackages = useAvailablePackages({
    prereleaseIntegrationsEnabled: false,
  });
  const { filteredCards } = availablePackages;

  let list: IntegrationCardItem[] = [];
  if (featuredCards || generatedCards) {
    featuredCards?.forEach((name) => {
      const card = filteredCards.find((c) => c.name === name);
      if (card)
        list.push({ ...card, isQuickstart: QUICKSTART_FLOWS.includes(name) });
    });
    generatedCards?.forEach((c) => list.push(c));
  } else {
    list = filteredCards.filter((card) =>
      card.categories.includes(selectedCategory)
    );
  }
  const showPackageList =
    (showSearchBar && !initialHidden) || showSearchBar === false;

  return (
    <Suspense fallback={<Loading />}>
      {!!showSearchBar && (
        <EuiSearchBar
          box={{ incremental: true }}
          onChange={(arg) => {
            setIntegrationSearch(arg.queryText);
            setInitialHidden(false);
          }}
          query={integrationSearch}
        />
      )}
      {showPackageList && (
        <PackageList
          list={list}
          searchTerm={integrationSearch}
          showControls={false}
          showSearchTools={false}
          // we either don't need these properties (yet) or handle them upstream, but
          // they are marked as required in the original API.
          selectedCategory={selectedCategory}
          setSearchTerm={() => {}}
          setCategory={() => {}}
          categories={[]}
          setUrlandReplaceHistory={() => {}}
          setUrlandPushHistory={() => {}}
        />
      )}
    </Suspense>
  );
};

const WithAvailablePackages = (props: Props) => {
  const ref = useRef<AvailablePackagesHookType | null>(null);
  const [loadingModule, setLoadingModule] = React.useState(true);

  useEffect(() => {
    async function load() {
      ref.current = await fetchAvailablePackagesHook();
      setLoadingModule(false);
    }
    load();
  }, []);

  if (loadingModule || ref.current === null) return null;
  return (
    <PackageListGridWrapper {...props} useAvailablePackages={ref.current} />
  );
};

export { WithAvailablePackages as OnboardingFlowPackageList };
