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
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButton,
  EuiCallOut,
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
  searchBarRef?: React.Ref<HTMLInputElement>;
  searchQuery?: string;
  setSearchQuery?: React.Dispatch<React.SetStateAction<string>>;
}

type WrapperProps = Props & {
  useAvailablePackages: AvailablePackagesHookType;
};

const Loading = () => <EuiSkeletonText isLoading={true} lines={10} />;

const PackageListGridWrapper = ({
  selectedCategory = 'observability',
  useAvailablePackages,
  showSearchBar = false,
  featuredCards: featuredCardNames,
  generatedCards,
  searchBarRef,
  searchQuery,
  setSearchQuery,
}: WrapperProps) => {
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
  React.useEffect(() => {
    if (isInitialHidden && searchQuery) {
      setIsInitialHidden(false);
    }
  }, [searchQuery, isInitialHidden]);
  if (!isInitialHidden && availablePackages.isLoading) return <Loading />;

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
              box={{
                incremental: true,
                inputRef: (ref: any) => {
                  (
                    searchBarRef as React.MutableRefObject<HTMLInputElement>
                  ).current = ref;
                },
              }}
              onChange={(arg) => {
                if (setSearchQuery) {
                  setSearchQuery(arg.queryText);
                }
                setIsInitialHidden(false);
              }}
              query={searchQuery}
            />
          </div>
        )}
        {showPackageList && (
          <PackageList
            list={list}
            searchTerm={searchQuery ?? ''}
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

const WithAvailablePackages = React.forwardRef(
  (props: Props, searchBarRef?: React.Ref<HTMLInputElement>) => {
    const ref = useRef<AvailablePackagesHookType | null>(null);
    const [reloadRetry, setReloadRetry] = useState(0);
    const [errorLoading, setErrorLoading] = useState(false);
    const [loadingModule, setLoadingModule] = React.useState(true);

    useEffect(() => {
      async function load() {
        setErrorLoading(false);
        setLoadingModule(true);
        try {
          ref.current = await fetchAvailablePackagesHook();
        } catch (e) {
          setErrorLoading(true);
        } finally {
          setLoadingModule(false);
        }
      }
      load();
    }, [reloadRetry]);

    if (errorLoading)
      return (
        <EuiCallOut
          title={i18n.translate(
            'xpack.observability_onboarding.asyncLoadFailureCallout.title',
            {
              defaultMessage: 'Loading failure',
            }
          )}
          color="warning"
          iconType="cross"
          size="m"
        >
          <p>
            <FormattedMessage
              id="xpack.observability_onboarding.asyncLoadFailureCallout.copy"
              defaultMessage="Some required elements failed to load."
            />
          </p>
          <EuiButton
            color="warning"
            data-test-subj="xpack.observability_onboarding.asyncLoadFailureCallout.button"
            onClick={() => {
              if (!loadingModule) setReloadRetry(reloadRetry + 1);
            }}
          >
            <FormattedMessage
              id="xpack.observability_onboarding.asyncLoadFailureCallout.buttonContent"
              defaultMessage="Retry"
            />
          </EuiButton>
        </EuiCallOut>
      );

    if (loadingModule || ref.current === null) return <Loading />;

    return (
      <PackageListGridWrapper
        {...props}
        useAvailablePackages={ref.current}
        searchBarRef={searchBarRef}
      />
    );
  }
);

export { WithAvailablePackages as OnboardingFlowPackageList };
