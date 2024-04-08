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
      description: (
        <ul>
          <li>
            {i18n.translate(
              'xpack.observability_onboarding.onboardingFlowForm.li.detectPatternsAndOutliersLabel',
              {
                defaultMessage:
                  'Detect patterns and outliers with log categorization and anomaly detection.',
              }
            )}
          </li>
          <li>
            {i18n.translate(
              'xpack.observability_onboarding.onboardingFlowForm.li.troubleshootInRealTimeLabel',
              { defaultMessage: 'Troubleshoot in real time with live tail.' }
            )}
          </li>
          <li>
            {i18n.translate(
              'xpack.observability_onboarding.onboardingFlowForm.li.getInsightsFromStructuredLabel',
              {
                defaultMessage:
                  'Get insights from structured and unstructured logs in minutes.',
              }
            )}
          </li>
          <li>
            {i18n.translate(
              'xpack.observability_onboarding.onboardingFlowForm.li.deployAndManageLogsLabel',
              { defaultMessage: 'Deploy and manage logs at petabyte scale.' }
            )}
          </li>
        </ul>
      ),
    },
    {
      id: 'apm',
      label: i18n.translate(
        'xpack.observability_onboarding.experimentalOnboardingFlow.euiCheckableCard.monitorMyApplicationPerformanceLabel',
        { defaultMessage: 'Monitor my application performance' }
      ),
      description: (
        <ul>
          <li>
            {i18n.translate(
              'xpack.observability_onboarding.onboardingFlowForm.li.captureAndAnalyzeDistributedLabel',
              {
                defaultMessage:
                  'Capture and analyze distributed transactions, traces, and profiling data for your applications.',
              }
            )}
          </li>
          <li>
            {i18n.translate(
              'xpack.observability_onboarding.onboardingFlowForm.li.identifyPerformanceBottlenecksWithLabel',
              {
                defaultMessage:
                  'Identify performance bottlenecks with automated and curated visual representation of all dependencies.',
              }
            )}
          </li>
          <li>
            {i18n.translate(
              'xpack.observability_onboarding.onboardingFlowForm.li.drillIntoAnomaliesTransactionLabel',
              {
                defaultMessage:
                  'Drill into anomalies, transaction details, errors and metrics for deeper analysis.',
              }
            )}
          </li>
          <li>
            {i18n.translate(
              'xpack.observability_onboarding.onboardingFlowForm.li.useMachineLearningToLabel',
              {
                defaultMessage:
                  'Use machine learning to automatically detect anomalies.',
              }
            )}
          </li>
        </ul>
      ),
    },
    {
      id: 'infra',
      label: i18n.translate(
        'xpack.observability_onboarding.experimentalOnboardingFlow.euiCheckableCard.monitorMyInfrastructureLabel',
        { defaultMessage: 'Monitor my infrastructure' }
      ),
      description: (
        <ul>
          <li>
            {i18n.translate(
              'xpack.observability_onboarding.onboardingFlowForm.li.builtOnPowerfulElasticsearchLabel',
              {
                defaultMessage:
                  'Built on powerful Elasticsearch, stream in and scale infrastructure metrics from your systems, cloud, network, and other infrastructure sources',
              }
            )}
          </li>
          <li>
            {i18n.translate(
              'xpack.observability_onboarding.onboardingFlowForm.li.getLogicalAndPhysicalLabel',
              {
                defaultMessage:
                  'Get logical and physical views of your infrastructure topology.',
              }
            )}
          </li>
          <li>
            {i18n.translate(
              'xpack.observability_onboarding.onboardingFlowForm.li.breakDownApplicationAndLabel',
              {
                defaultMessage:
                  'Break down application and infrastructure silos for faster root cause detection',
              }
            )}
          </li>
        </ul>
      ),
    },
  ];

  const [selectedId, setSelectedId] = useState<string>();
  const [hoveredId, setHoveredId] = useState<string>();
  const customMargin = useCustomMargin();

  const visibleOption = hoveredId
    ? options.find((option) => option.id === hoveredId)
    : selectedId
    ? options.find((option) => option.id === selectedId)
    : undefined;

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
      <EuiFlexGroup css={customMargin}>
        <EuiFlexItem css={{ fontWeight: 'bold' }}>
          {options.map((option, index) => (
            <div
              key={option.id}
              onMouseEnter={() => setHoveredId(option.id)}
              onMouseLeave={() => setHoveredId(undefined)}
            >
              {/* Using EuiSpacer instead of EuiFlexGroup to ensure spacing is part of hit area for mouse hover effect */}
              {index > 0 && <EuiSpacer size="m" />}
              <EuiCheckableCard
                id={option.id}
                label={option.label}
                checked={selectedId === option.id}
                onChange={() => setSelectedId(option.id)}
              />
            </div>
          ))}
        </EuiFlexItem>
        <EuiFlexItem>
          {visibleOption && (
            <EuiPanel color="subdued">
              <EuiText size="s" color="subdued">
                {visibleOption.description}
              </EuiText>
            </EuiPanel>
          )}
        </EuiFlexItem>
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
              },
              {
                id: 'gcp-generated',
                title: 'Google Cloud Platfrm',
                description:
                  'Collect logs and metrics from Google Cloud Platform',
                name: 'gcp',
                categories: ['observability'],
                icons: [],
                url: 'https://gcp.com',
                version: '',
                integration: '',
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
          <OnboardingFlowPackageList showSearchBar={true} />
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
