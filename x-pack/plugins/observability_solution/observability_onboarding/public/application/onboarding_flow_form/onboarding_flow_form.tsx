/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
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
  useEuiTheme,
  EuiBadge,
  EuiIcon,
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
  logos?: SupportedLogo[];
  showIntegrationsBadge?: boolean;
}

type SupportedLogo =
  | 'aws'
  | 'azure'
  | 'docker'
  | 'dotnet'
  | 'prometheus'
  | 'gcp'
  | 'java'
  | 'javascript'
  | 'kubernetes'
  | 'nginx'
  | 'opentelemetry';

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
      logos: ['azure', 'aws', 'nginx', 'gcp'],
      showIntegrationsBadge: true,
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
      logos: ['opentelemetry', 'java', 'javascript', 'dotnet'],
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
      logos: ['kubernetes', 'prometheus', 'docker', 'opentelemetry'],
      showIntegrationsBadge: true,
    },
  ];

  const customMargin = useCustomMargin();
  const radioGroupId = useGeneratedHtmlId({ prefix: 'onboardingCategory' });

  const [searchParams, setSearchParams] = useSearchParams();

  const suggestedPackagesRef = useRef<HTMLDivElement | null>(null);
  const searchResultsRef = useRef<HTMLDivElement | null>(null);
  const [integrationSearch, setIntegrationSearch] = useState(searchParams.get('search') ?? '');
  const { euiTheme } = useEuiTheme();

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
      if (searchResultsRef.current) {
        setTimeout(
          scrollIntoViewWithOffset,
          40, // Adding slight delay to ensure DOM is updated before calculating scroll position
          searchResultsRef.current,
          parseInt(euiTheme.size.l, 10)
        );
      }
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const customCards = useCustomCardsForCategory(
    createCollectionCardHandler,
    searchParams.get('category') as Category | null
  );
  const virtualSearchResults = useVirtualSearchResults();

  let isSelectingCategoryWithKeyboard: boolean = false;

  return (
    <EuiPanel hasBorder paddingSize="xl">
      <TitleWithIcon
        iconType="createSingleMetricJob"
        title={i18n.translate(
          'xpack.observability_onboarding.experimentalOnboardingFlow.strong.startCollectingYourDataLabel',
          {
            defaultMessage: 'What do you want to monitor?',
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
                  {(option.logos || option.showIntegrationsBadge) && (
                    <>
                      <EuiSpacer size="m" />
                      <EuiFlexGroup gutterSize="s" responsive={false}>
                        {option.logos?.map((logo) => (
                          <EuiFlexItem key={logo} grow={false}>
                            <LogoIcon logo={logo} />
                          </EuiFlexItem>
                        ))}
                        {option.showIntegrationsBadge && (
                          <EuiBadge color="hollow">
                            <FormattedMessage
                              defaultMessage="+ Integrations"
                              id="xpack.observability_onboarding.experimentalOnboardingFlow.form.addIntegrations"
                              description="A badge indicating that the user can add additional observability integrations to their deployment via this option"
                            />
                          </EuiBadge>
                        )}
                      </EuiFlexGroup>
                    </>
                  )}
                </>
              }
              checked={option.id === searchParams.get('category')}
              /**
               * onKeyDown and onKeyUp handlers disable
               * scrolling to the category items when user
               * changes the selected category using keyboard,
               * which prevents our custom scroll behavior
               * from conflicting with browser's native one to
               * put keyboard-focused item into the view.
               */
              onKeyDown={() => (isSelectingCategoryWithKeyboard = true)}
              onKeyUp={() => (isSelectingCategoryWithKeyboard = false)}
              onChange={() => {
                setIntegrationSearch('');
                setSearchParams({ category: option.id }, { replace: true });
              }}
              onClick={() => {
                if (!isSelectingCategoryWithKeyboard && suggestedPackagesRef.current) {
                  setTimeout(
                    scrollIntoViewWithOffset,
                    40, // Adding slight delay to ensure DOM is updated before calculating scroll position
                    suggestedPackagesRef.current,
                    parseInt(euiTheme.size.l, 10)
                  );
                }
              }}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      {/* Hiding element instead of not rending these elements in order to preload available packages on page load */}
      <div hidden={!searchParams.get('category') || !customCards}>
        <EuiSpacer />
        <div ref={suggestedPackagesRef}>
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
          <OnboardingFlowPackageList
            customCards={customCards}
            flowSearch={integrationSearch}
            flowCategory={searchParams.get('category')}
          />
        </div>
        <div ref={searchResultsRef}>
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
            customCards={customCards
              ?.filter(
                // Filter out collection cards and regular integrations that show up via search anyway
                (card) => card.type === 'virtual' && !card.isCollectionCard
              )
              .concat(virtualSearchResults)}
            joinCardLists
          />
        </div>
      </div>
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
      <EuiAvatar size="l" name={title} iconType={iconType} iconSize="l" color="subdued" />
    </EuiFlexItem>
    <EuiFlexItem>
      <EuiTitle size="s">
        <strong>{title}</strong>
      </EuiTitle>
    </EuiFlexItem>
  </EuiFlexGroup>
);

function scrollIntoViewWithOffset(element: HTMLElement, offset = 0) {
  // Fixed header in Kibana is different height between serverless and stateful so need to calculate dynamically.
  const fixedHeaders = document.querySelectorAll('#globalHeaderBars [data-fixed-header=true]');
  fixedHeaders.forEach((header) => {
    offset += header.getBoundingClientRect().height;
  });

  window.scrollTo({
    behavior: 'smooth',
    top: element.getBoundingClientRect().top - document.body.getBoundingClientRect().top - offset,
  });
}

function useIconForLogo(logo?: SupportedLogo): string | undefined {
  const {
    services: { http },
  } = useKibana();
  switch (logo) {
    case 'aws':
      return 'logoAWS';
    case 'azure':
      return 'logoAzure';
    case 'gcp':
      return 'logoGCP';
    case 'kubernetes':
      return 'logoKubernetes';
    case 'nginx':
      return 'logoNginx';
    case 'prometheus':
      return 'logoPrometheus';
    case 'docker':
      return 'logoDocker';
    default:
      return http?.staticAssets.getPluginAssetHref(`${logo}.svg`);
  }
}

function LogoIcon({ logo }: { logo: SupportedLogo }) {
  const iconType = useIconForLogo(logo);
  if (iconType) {
    return <EuiIcon type={iconType} />;
  }
  return null;
}
