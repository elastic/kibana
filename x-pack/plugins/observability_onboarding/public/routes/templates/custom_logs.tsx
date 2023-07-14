/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import React, { ComponentType, useRef, useState } from 'react';
import { breadcrumbsApp } from '../../application/app';
import { HorizontalSteps } from '../../components/app/custom_logs/wizard/horizontal_steps';
import { Provider as WizardProvider } from '../../components/app/custom_logs/wizard';
import {
  FilmstripFrame,
  FilmstripTransition,
  TransitionState,
} from '../../components/shared/filmstrip_transition';

interface Props {
  children: React.ReactNode;
}

export function CustomLogs({ children }: Props) {
  useBreadcrumbs(
    [
      {
        text: i18n.translate(
          'xpack.observability_onboarding.breadcrumbs.customLogs',
          { defaultMessage: 'Custom Logs' }
        ),
      },
    ],
    breadcrumbsApp
  );
  return <AnimatedTransitionsWizard>{children}</AnimatedTransitionsWizard>;
}

const TRANSITION_DURATION = 180;

function AnimatedTransitionsWizard({ children }: Props) {
  const [transition, setTransition] = useState<TransitionState>('ready');
  const TransitionComponent = useRef<ComponentType>(() => null);

  function onChangeStep({
    direction,
    StepComponent,
  }: {
    direction: 'back' | 'next';
    StepComponent: ComponentType;
  }) {
    setTransition(direction);
    TransitionComponent.current = StepComponent;
    setTimeout(() => {
      setTransition('ready');
    }, TRANSITION_DURATION + 10);
  }

  return (
    <WizardProvider
      transitionDuration={TRANSITION_DURATION}
      onChangeStep={onChangeStep}
    >
      <EuiFlexGroup direction="column" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiSpacer size="l" />
          <EuiTitle
            size="l"
            data-test-subj="obltOnboardingStreamLogFilePageHeader"
          >
            <h1>
              {i18n.translate(
                'xpack.observability_onboarding.title.collectCustomLogs',
                {
                  defaultMessage: 'Collect custom logs',
                }
              )}
            </h1>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ width: '50%' }}>
          <HorizontalSteps />
        </EuiFlexItem>
        <EuiFlexItem grow={1} style={{ width: '50%' }}>
          <FilmstripTransition
            duration={TRANSITION_DURATION}
            transition={transition}
          >
            <FilmstripFrame position="left">
              {
                // eslint-disable-next-line react/jsx-pascal-case
                transition === 'back' ? <TransitionComponent.current /> : null
              }
            </FilmstripFrame>
            <FilmstripFrame position="center">{children}</FilmstripFrame>
            <FilmstripFrame position="right">
              {
                // eslint-disable-next-line react/jsx-pascal-case
                transition === 'next' ? <TransitionComponent.current /> : null
              }
            </FilmstripFrame>
          </FilmstripTransition>
        </EuiFlexItem>
      </EuiFlexGroup>
    </WizardProvider>
  );
}
