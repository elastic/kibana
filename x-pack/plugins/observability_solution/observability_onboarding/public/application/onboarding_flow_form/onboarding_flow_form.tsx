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
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCard,
  EuiIcon,
  EuiAvatar,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';

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

  const { euiTheme } = useEuiTheme();

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
      <EuiFlexGroup
        css={{ margin: `calc(${euiTheme.size.xxl} / 2)` }}
        gutterSize="m"
        direction="column"
      >
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

          {/* Mock integrations grid */}
          <EuiFlexGrid columns={3} css={{ margin: 20 }}>
            {new Array(6).fill(null).map((_, index) => (
              <EuiCard
                key={index}
                layout="horizontal"
                title={selectedId!}
                titleSize="xs"
                description={selectedId!}
                icon={<EuiIcon type="logoObservability" size="l" />}
                betaBadgeProps={
                  index === 0
                    ? {
                        label: 'Quick Start',
                        color: 'accent',
                        size: 's',
                      }
                    : undefined
                }
                hasBorder
                css={{
                  borderColor: index === 0 ? '#ba3d76' : undefined,
                }}
              />
            ))}
          </EuiFlexGrid>
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
