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
import { css } from '@emotion/react';
import React, { useEffect, useRef, Suspense, useState } from 'react';
import { PackageList, fetchAvailablePackagesHook } from './lazy';
import { useIntegrationCardList } from './use_integration_card_list';
import { useCustomMargin } from '../shared/use_custom_margin';

interface Props {
  /**
   * The inclusive set of card names to display.
   */
  featuredCards?: string[];
  /**
   * Cards that do not correspond to an integration, but
   * have some custom behavior.
   */
  generatedCards?: IntegrationCardItem[];
  /**
   * Override the default `observability` option.
   */
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

const PackageListGridWrapper = ({
  selectedCategory = 'observability',
  useAvailablePackages,
  showSearchBar = false,
  featuredCards: featuredCardNames,
  generatedCards,
}: WrapperProps) => {
  const [integrationSearch, setIntegrationSearch] = useState('');
  const [isInitialHidden, setIsInitialHidden] = useState(showSearchBar);
  const customMargin = useCustomMargin();
  const availablePackages = useAvailablePackages({
    prereleaseIntegrationsEnabled: false,
  });
  const { filteredCards } = availablePackages;

  const list: IntegrationCardItem[] = useIntegrationCardList(
    filteredCards,
    selectedCategory,
    featuredCardNames,
    generatedCards
  );
  const showPackageList =
    (showSearchBar && !isInitialHidden) || showSearchBar === false;

  return (
    <Suspense fallback={<Loading />}>
      <div css={customMargin}>
        {showSearchBar && (
          <div
            css={css`
              max-width: 600px;
            `}
          >
            <EuiSearchBar
              box={{ incremental: true }}
              onChange={(arg) => {
                setIntegrationSearch(arg.queryText);
                setIsInitialHidden(false);
              }}
              query={integrationSearch}
            />
          </div>
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
      </div>
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
