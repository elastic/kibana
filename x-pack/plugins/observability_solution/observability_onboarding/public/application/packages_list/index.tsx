/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AvailablePackagesHookType, IntegrationCardItem } from '@kbn/fleet-plugin/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiCallOut, EuiSearchBar, EuiSkeletonText } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useRef, Suspense, useEffect } from 'react';
import useAsyncRetry from 'react-use/lib/useAsyncRetry';
import { PackageList, fetchAvailablePackagesHook } from './lazy';
import { useIntegrationCardList } from './use_integration_card_list';
import { useCustomMargin } from '../shared/use_custom_margin';
import { CustomCard } from './types';

interface Props {
  /**
   * A subset of either existing card names to feature, or virtual
   * cards to display. The inclusion of CustomCards will override the default
   * list functionality.
   */
  customCards?: CustomCard[];
  /**
   * Override the default `observability` option.
   */
  selectedCategory?: string[];
  showSearchBar?: boolean;
  packageListRef?: React.Ref<HTMLDivElement>;
  searchQuery?: string;
  setSearchQuery?: React.Dispatch<React.SetStateAction<string>>;
  flowCategory?: string | null;
  flowSearch?: string;
  /**
   * When enabled, custom and integration cards are joined into a single list.
   */
  joinCardLists?: boolean;
  excludePackageIdList?: string[];
  onLoaded?: () => void;
}

type WrapperProps = Props & {
  useAvailablePackages: AvailablePackagesHookType;
};

const Loading = () => <EuiSkeletonText isLoading={true} lines={10} />;

const PackageListGridWrapper = ({
  selectedCategory = ['observability', 'os_system'],
  useAvailablePackages,
  showSearchBar = false,
  packageListRef,
  searchQuery,
  setSearchQuery,
  customCards,
  flowCategory,
  flowSearch,
  joinCardLists = false,
  excludePackageIdList = [],
  onLoaded,
}: WrapperProps) => {
  const customMargin = useCustomMargin();
  const { filteredCards, isLoading } = useAvailablePackages({
    prereleaseIntegrationsEnabled: false,
  });

  const list: IntegrationCardItem[] = useIntegrationCardList(
    filteredCards,
    selectedCategory,
    excludePackageIdList,
    customCards,
    flowCategory,
    flowSearch,
    joinCardLists
  );

  useEffect(() => {
    if (!isLoading && onLoaded !== undefined) {
      onLoaded();
    }
  }, [isLoading, onLoaded]);

  if (isLoading) return <Loading />;

  const showPackageList = (showSearchBar && !!searchQuery) || showSearchBar === false;

  return (
    <Suspense fallback={<Loading />}>
      <div css={customMargin} ref={packageListRef}>
        {showSearchBar && (
          <div
            css={css`
              max-width: 600px;
            `}
          >
            <EuiSearchBar
              box={{
                incremental: true,
              }}
              onChange={({ queryText, error }) => {
                if (error) return;

                setSearchQuery?.(queryText);
              }}
              query={searchQuery ?? ''}
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
            selectedCategory=""
            setSearchTerm={() => {}}
            setCategory={() => {}}
            categories={[]}
            setUrlandReplaceHistory={() => {}}
            setUrlandPushHistory={() => {}}
            showCardLabels={false}
          />
        )}
      </div>
    </Suspense>
  );
};

const WithAvailablePackages = React.forwardRef(
  (props: Props, packageListRef?: React.Ref<HTMLDivElement>) => {
    const ref = useRef<AvailablePackagesHookType | null>(null);

    const {
      error: errorLoading,
      retry: retryAsyncLoad,
      loading: asyncLoading,
    } = useAsyncRetry(async () => {
      ref.current = await fetchAvailablePackagesHook();
    });

    if (errorLoading)
      return (
        <EuiCallOut
          title={i18n.translate('xpack.observability_onboarding.asyncLoadFailureCallout.title', {
            defaultMessage: 'Loading failure',
          })}
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
              if (!asyncLoading) retryAsyncLoad();
            }}
          >
            <FormattedMessage
              id="xpack.observability_onboarding.asyncLoadFailureCallout.buttonContent"
              defaultMessage="Retry"
            />
          </EuiButton>
        </EuiCallOut>
      );

    if (asyncLoading || ref.current === null) return <Loading />;

    return (
      <PackageListGridWrapper
        {...props}
        useAvailablePackages={ref.current}
        packageListRef={packageListRef}
      />
    );
  }
);

export { WithAvailablePackages as OnboardingFlowPackageList };
