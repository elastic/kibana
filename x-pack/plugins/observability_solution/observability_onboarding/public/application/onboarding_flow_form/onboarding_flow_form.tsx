/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import React, { useState } from 'react';
import type { FunctionComponent } from 'react';
import {
  EuiCheckableCard,
  EuiTitle,
  EuiText,
  EuiPanel,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiAvatar,
  useGeneratedHtmlId,
} from '@elastic/eui';

import { OnboardingFlowPackageList } from '../packages_list';
import { useCustomMargin } from '../shared/use_custom_margin';

interface UseCaseOption {
  id: string;
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
          defaultMessage:
            'Detect patterns, troubleshoot in real time, gain insights from logs.',
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
            'Collect distributed traces and catch application performance problems.',
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

  const radioGroupId = useGeneratedHtmlId({ prefix: 'onboardingUseCase' });
  const [selectedId, setSelectedId] = useState<string>();
  const customMargin = useCustomMargin();
  const packageListSearchBarRef = React.useRef<null | HTMLInputElement>(null);
  const [integrationSearch, setIntegrationSearch] = useState('');

  const createCollectionCardHandler = (query: string) => () => {
    setIntegrationSearch(query);
    if (packageListSearchBarRef.current) {
      packageListSearchBarRef.current.focus();
      packageListSearchBarRef.current.scrollIntoView({
        behavior: 'auto',
        block: 'center',
      });
    }
  };

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
        {options.map((option, index) => (
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
              checked={selectedId === option.id}
              onChange={() => setSelectedId(option.id)}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>

      {selectedId && (
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

          <OnboardingFlowPackageList
            featuredCards={['kubernetes', 'prometheus', 'docker']}
            generatedCards={[
              {
                id: 'azure-generated',
                title: 'Azure',
                description: 'Collect logs and metrics from Microsoft Azure',
                name: 'azure',
                categories: ['observability'],
                icons: [],
                url: 'https://azure.com',
                version: '',
                integration: '',
                isCollectionCard: true,
                onCardClick: createCollectionCardHandler('azure'),
              },
              {
                id: 'aws-generated',
                title: 'AWS',
                description:
                  'Collect logs and metrics from Amazon Web Services (AWS)',
                name: 'aws',
                categories: ['observability'],
                icons: [],
                url: 'https://aws.com',
                version: '',
                integration: '',
                isCollectionCard: true,
                onCardClick: createCollectionCardHandler('aws'),
              },
              {
                id: 'gcp-generated',
                title: 'Google Cloud Platfrm',
                description:
                  'Collect logs and metrics from Google Cloud Platform',
                name: 'gcp',
                categories: ['observability'],
                icons: [],
                url: '',
                version: '',
                integration: '',
                isCollectionCard: true,
                onCardClick: createCollectionCardHandler('gcp'),
              },
            ]}
          />

          <EuiText css={customMargin} size="s" color="subdued">
            {i18n.translate(
              'xpack.observability_onboarding.experimentalOnboardingFlow.form.searchPromptText',
              {
                defaultMessage:
                  'Not seeing yours? Search through our 300+ ways of ingesting data:',
              }
            )}
          </EuiText>
          <OnboardingFlowPackageList
            showSearchBar={true}
            searchQuery={integrationSearch}
            setSearchQuery={setIntegrationSearch}
            ref={packageListSearchBarRef}
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

const TitleWithIcon: FunctionComponent<TitleWithIconProps> = ({
  title,
  iconType,
}) => (
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
