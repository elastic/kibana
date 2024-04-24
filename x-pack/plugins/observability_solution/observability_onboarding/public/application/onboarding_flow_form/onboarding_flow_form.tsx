/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import React, { useCallback, useEffect, useState } from 'react';
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
        { defaultMessage: 'Collect and analyze my logs' }
      ),
      description: i18n.translate(
        'xpack.observability_onboarding.onboardingFlowForm.detectPatternsAndOutliersLabel',
        {
          defaultMessage: 'Detect patterns, troubleshoot in real time, gain insights from logs.',
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
          defaultMessage: 'Collect distributed traces and catch application performance problems.',
        }
      ),
    },
    {
      id: 'infra',
      label: i18n.translate(
        'xpack.observability_onboarding.experimentalOnboardingFlow.euiCheckableCard.monitorMyInfrastructureLabel',
        { defaultMessage: 'Monitor my infrastructure' }
      ),
      description: i18n.translate(
        'xpack.observability_onboarding.onboardingFlowForm.builtOnPowerfulElasticsearchLabel',
        {
          defaultMessage:
            'Stream infrastructure metrics and accelerate root cause detection by breaking down silos.',
        }
      ),
    },
  ];

  const customMargin = useCustomMargin();
  const radioGroupId = useGeneratedHtmlId({ prefix: 'onboardingCategory' });

  const [searchParams, setSearchParams] = useSearchParams();

  const packageListRef = React.useRef<HTMLDivElement | null>(null);
  const [integrationSearch, setIntegrationSearch] = useState(searchParams.get('search') ?? '');

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
            block: 'center',
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

  return (
    <EuiPanel hasBorder>
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
      <EuiFlexGroup css={customMargin} gutterSize="m" direction="column">
        {options.map((option) => (
          <EuiFlexItem key={option.id}>
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
              onChange={() => setSearchParams({ category: option.id }, { replace: true })}
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
          <EuiSpacer size="m" />

          {Array.isArray(customCards) && (
            <OnboardingFlowPackageList
              customCards={customCards}
              flowSearch={integrationSearch}
              flowCategory={searchParams.get('category')}
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
            customCards={customCards?.filter(
              // Filter out collection cards and regular integrations that show up via search anyway
              (card) => card.type === 'virtual' && !card.isCollectionCard
            )}
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
      <EuiAvatar size="l" name={title} iconType={iconType} color="subdued" />
    </EuiFlexItem>
    <EuiFlexItem>
      <EuiTitle size="xs">
        <strong>{title}</strong>
      </EuiTitle>
    </EuiFlexItem>
  </EuiFlexGroup>
);
