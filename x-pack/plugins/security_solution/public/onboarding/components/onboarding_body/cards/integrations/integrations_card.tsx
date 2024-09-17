/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import useAsyncRetry from 'react-use/lib/useAsyncRetry';

import {
  EuiButton,
  EuiButtonGroup,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonText,
} from '@elastic/eui';
import type {
  AvailablePackagesHookType,
  IntegrationCardItem,
  CategoryFacet,
} from '@kbn/fleet-plugin/public';
import { noop } from 'lodash';

import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { OnboardingCardComponent } from '../../../../types';
import { OnboardingCardContentPanel } from '../common/card_content_panel';
import { PackageList, fetchAvailablePackagesHook } from './utils';
import { useIntegrationCardList } from './hooks';

interface Props {
  /**
   * A subset of either existing card names to feature, or virtual
   * cards to display. The inclusion of CustomCards will override the default
   * list functionality.
   */
  onLoaded?: () => void;
}

type WrapperProps = Props & {
  useAvailablePackages: AvailablePackagesHookType;
};

const Loading = () => <EuiSkeletonText isLoading={true} lines={10} />;

const categories: CategoryFacet[] = [];
const tabs = [
  {
    id: 'featured',
    label: 'Recommended',
    category: '',
    customCards: ['1password'],
    iconType: 'starFilled',
  },
  {
    id: 'network',
    label: 'Network',
    category: 'security',
    subCategory: 'network_security',
  },
  {
    id: 'user',
    label: 'User',
    category: 'security',
    subCategory: 'iam',
  },
  {
    id: 'endpoint',
    label: 'Endpoint',
    category: 'security',
    subCategory: 'edr_xdr',
  },
  {
    id: 'cloud',
    label: 'Cloud',
    category: 'security',
    subCategory: 'cloudsecurity_cdr',
  },
  {
    id: 'threatIntel',
    label: 'Threat Intel',
    category: 'security',
    subCategory: 'threat_intel',
  },
  {
    id: 'all',
    label: 'All',
    category: '',
  },
];
const defaultTab = tabs[0];

export const IntegrationsCard: OnboardingCardComponent = ({
  setComplete,
  checkCompleteMetadata, // this is undefined before the first checkComplete call finishes
}) => {
  // TODO: implement. This is just for demo purposes
  return (
    <OnboardingCardContentPanel>
      <WithAvailablePackages />
    </OnboardingCardContentPanel>
  );
};

const PackageListGridWrapper = ({ useAvailablePackages, onLoaded }: WrapperProps) => {
  const [toggleIdSelected, setToggleIdSelected] = useState(defaultTab.id);
  const onChange = (optionId: string) => {
    setToggleIdSelected(optionId);
  };

  const {
    filteredCards,
    installedIntegrationList,
    isLoading,
    searchTerm: searchQuery,
    setCategory,
    setSearchTerm,
    setSelectedSubCategory,
  } = useAvailablePackages({
    prereleaseIntegrationsEnabled: false,
  });

  const selectedTab = useMemo(
    () => tabs.find(({ id }) => id === toggleIdSelected),
    [toggleIdSelected]
  );

  const selectedCategory = selectedTab?.category ?? '';
  const selectedSubCategory = selectedTab?.subCategory;
  const customCards = useMemo(() => selectedTab?.customCards, [selectedTab]);

  useEffect(() => {
    setCategory(selectedCategory);
    setSelectedSubCategory(selectedSubCategory);
  });

  const list: IntegrationCardItem[] = useIntegrationCardList({
    integrationsList: filteredCards,
    customCards,
    installedIntegrationList,
  });

  useEffect(() => {
    if (!isLoading) {
      onLoaded?.();
    }
  }, [isLoading, onLoaded]);

  if (isLoading) return <Loading />;

  return (
    <EuiFlexGroup direction="column" className="step-paragraph" gutterSize="m">
      <EuiFlexItem grow={false}>
        <EuiButtonGroup
          legend="Categories"
          options={tabs}
          idSelected={toggleIdSelected}
          onChange={(id) => onChange(id)}
          color="primary"
          buttonSize="compressed"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <Suspense fallback={<Loading />}>
          <div>
            <PackageList
              list={list}
              searchTerm={searchQuery ?? ''}
              showControls={false}
              showSearchTools
              // we either don't need these properties (yet) or handle them upstream, but
              // they are marked as required in the original API.
              selectedCategory={selectedCategory}
              selectedSubCategory={selectedSubCategory}
              setSearchTerm={setSearchTerm}
              setCategory={setCategory}
              categories={categories} // We do not want to show categories and subcategories as the search bar filter
              setUrlandReplaceHistory={noop}
              setUrlandPushHistory={noop}
              showCardLabels={false}
            />
          </div>
        </Suspense>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const WithAvailablePackages = React.forwardRef((props: Props) => {
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
        title={i18n.translate('xpack.securitySolution.onboarding.asyncLoadFailureCallout.title', {
          defaultMessage: 'Loading failure',
        })}
        color="warning"
        iconType="cross"
        size="m"
      >
        <p>
          <FormattedMessage
            id="xpack.securitySolution.onboarding.asyncLoadFailureCallout.copy"
            defaultMessage="Some required elements failed to load."
          />
        </p>
        <EuiButton
          color="warning"
          data-test-subj="xpack.securitySolution.onboarding.asyncLoadFailureCallout.button"
          onClick={() => {
            if (!asyncLoading) retryAsyncLoad();
          }}
        >
          <FormattedMessage
            id="xpack.securitySolution.onboarding.asyncLoadFailureCallout.buttonContent"
            defaultMessage="Retry"
          />
        </EuiButton>
      </EuiCallOut>
    );

  if (asyncLoading || ref.current === null) return <Loading />;

  return <PackageListGridWrapper {...props} useAvailablePackages={ref.current} />;
});

// eslint-disable-next-line import/no-default-export
export default IntegrationsCard;
