/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FunctionComponent } from 'react';
import {
  EuiAvatar,
  EuiCheckableCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';

import { useSearchParams } from 'react-router-dom-v5-compat';
import { OnboardingFlowPackageList } from '../packages_list';
import { useCustomMargin } from '../shared/use_custom_margin';
import { Category } from './types';
import { useCustomCardsForCategory } from './use_custom_cards_for_category';
import { useVirtualSearchResults } from './use_virtual_search_results';

interface UseCaseOption {
  id: Category;
  label: string;
  description: React.ReactNode;
}

export const OnboardingFlowForm: FunctionComponent = () => {
  const options: UseCaseOption[] = [
    {
      id: 'logs',
      label: i18n.translate(
        'xpack.observability_onboarding.experimentalOnboardingFlow.euiCheckableCard.collectAndAnalyzeMyLabel',
        { defaultMessage: 'Collect and analyze logs' }
      ),
      description: i18n.translate(
        'xpack.observability_onboarding.onboardingFlowForm.detectPatternsAndOutliersLabel',
        {
          defaultMessage:
            'Detect patterns, gain insights from logs, get alerted when surpassing error thresholds',
        }
      ),
    },
    {
      id: 'apm',
      label: i18n.translate(
        'xpack.observability_onboarding.experimentalOnboardingFlow.euiCheckableCard.monitorMyApplicationPerformanceLabel',
        { defaultMessage: 'Monitor my application performance' }
      ),
      description: i18n.translate(
        'xpack.observability_onboarding.onboardingFlowForm.captureAndAnalyzeDistributedLabel',
        {
          defaultMessage:
            'Catch application problems, get alerted on performance issues or SLO breaches, expedite root cause analysis and remediation',
        }
      ),
    },
    {
      id: 'infra',
      label: i18n.translate(
        'xpack.observability_onboarding.experimentalOnboardingFlow.euiCheckableCard.monitorMyInfrastructureLabel',
        { defaultMessage: 'Monitor infrastructure' }
      ),
      description: i18n.translate(
        'xpack.observability_onboarding.onboardingFlowForm.builtOnPowerfulElasticsearchLabel',
        {
          defaultMessage:
            'Check my system’s health, get alerted on performance issues or SLO breaches, expedite root cause analysis and remediation',
        }
      ),
    },
  ];

  const customMargin = useCustomMargin();
  const radioGroupId = useGeneratedHtmlId({ prefix: 'onboardingCategory' });

  const [searchParams, setSearchParams] = useSearchParams();

  const [hasPackageListLoaded, setHasPackageListLoaded] = useState<boolean>(false);
  const onPackageListLoaded = useCallback(() => {
    setHasPackageListLoaded(true);
  }, []);
  const packageListRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLDivElement | null>(null);
  const [integrationSearch, setIntegrationSearch] = useState(searchParams.get('search') ?? '');
  const selectedCategory: Category | null = searchParams.get('category') as Category | null;

  useEffect(() => {
    if (selectedCategory === null || !hasPackageListLoaded) {
      return;
    }

    const timeout = setTimeout(() => {
      formRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
      });
    }, 10);

    return () => clearTimeout(timeout);
  }, [selectedCategory, hasPackageListLoaded]);

  useEffect(() => {
    const searchParam = searchParams.get('search') ?? '';
    if (integrationSearch === searchParam) return;
    const entries: Record<string, string> = Object.fromEntries(searchParams.entries());
    if (integrationSearch) {
      entries.search = integrationSearch;
    } else {
      delete entries.search;
    }
    setSearchParams(entries, { replace: true });
  }, [integrationSearch, searchParams, setSearchParams]);

  const createCollectionCardHandler = useCallback(
    (query: string) => () => {
      setIntegrationSearch(query);
      if (packageListRef.current) {
        // adding a slight delay causes the search bar to be rendered
        new Promise((r) => setTimeout(r, 10)).then(() =>
          packageListRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          })
        );
      }
    },
    []
  );

  const customCards = useCustomCardsForCategory(
    createCollectionCardHandler,
    searchParams.get('category') as Category | null
  );
  const virtualSearchResults = useVirtualSearchResults();

  return (
    <EuiPanel hasBorder paddingSize="xl" panelRef={formRef}>
      <TitleWithIcon
        iconType="indexRollupApp"
        title={i18n.translate(
          'xpack.observability_onboarding.experimentalOnboardingFlow.strong.startCollectingYourDataLabel',
          {
            defaultMessage:
              'Start collecting your data by selecting one of the following use cases',
          }
        )}
      />
      <EuiSpacer size="m" />
      <EuiFlexGroup css={{ ...customMargin, maxWidth: '560px' }} gutterSize="l" direction="column">
        {options.map((option) => (
          <EuiFlexItem
            key={option.id}
            data-test-subj={`observabilityOnboardingUseCaseCard-${option.id}`}
          >
            <EuiCheckableCard
              id={`${radioGroupId}_${option.id}`}
              name={radioGroupId}
              label={
                <>
                  <EuiText css={{ fontWeight: 'bold' }}>{option.label}</EuiText>
                  <EuiSpacer size="s" />
                  <EuiText color="subdued" size="s">
                    {option.description}
                  </EuiText>
                </>
              }
              checked={option.id === searchParams.get('category')}
              onChange={() => {
                setIntegrationSearch('');
                setSearchParams({ category: option.id }, { replace: true });
              }}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      {searchParams.get('category') && (
        <>
          <EuiSpacer />
          <TitleWithIcon
            iconType="savedObjectsApp"
            title={i18n.translate(
              'xpack.observability_onboarding.experimentalOnboardingFlow.whatTypeOfResourceLabel',
              {
                defaultMessage: 'What type of resource are you monitoring?',
              }
            )}
          />
          <EuiSpacer size="s" />

          {Array.isArray(customCards) && (
            <OnboardingFlowPackageList
              customCards={customCards}
              flowSearch={integrationSearch}
              flowCategory={searchParams.get('category')}
              onLoaded={onPackageListLoaded}
            />
          )}

          <EuiText css={customMargin} size="s" color="subdued">
            <FormattedMessage
              id="xpack.observability_onboarding.experimentalOnboardingFlow.form.searchPromptText"
              defaultMessage="Not seeing yours? Search through our 130 ways of ingesting data:"
            />
          </EuiText>
          <OnboardingFlowPackageList
            showSearchBar={true}
            searchQuery={integrationSearch}
            flowSearch={integrationSearch}
            setSearchQuery={setIntegrationSearch}
            flowCategory={searchParams.get('category')}
            ref={packageListRef}
            customCards={customCards
              ?.filter(
                // Filter out collection cards and regular integrations that show up via search anyway
                (card) => card.type === 'virtual' && !card.isCollectionCard
              )
              .concat(virtualSearchResults)}
            joinCardLists
          />
        </>
      )}
    </EuiPanel>
  );
};

interface TitleWithIconProps {
  title: string;
  iconType: string;
}

const TitleWithIcon: FunctionComponent<TitleWithIconProps> = ({ title, iconType }) => (
  <EuiFlexGroup responsive={false} gutterSize="m" alignItems="center">
    <EuiFlexItem grow={false}>
      <EuiAvatar
        size="l"
        name={title}
        iconType={iconType}
        iconSize="l"
        color="subdued"
        css={{
          /**
           * Nudges the icon a bit to the
           * right because it's not symmetrical and
           * look off-center by default. This makes
           * it visually centered.
           */
          padding: '24px 22px 24px 26px',
        }}
      />
    </EuiFlexItem>
    <EuiFlexItem>
      <EuiTitle size="s">
        <strong>{title}</strong>
      </EuiTitle>
    </EuiFlexItem>
  </EuiFlexGroup>
);
