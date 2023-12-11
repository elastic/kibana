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
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ObservabilityOnboardingPluginContextValue } from '../../plugin';
import { breadcrumbsApp } from '../../application/app';
import { Provider as WizardProvider } from '../../components/app/custom_logs';
import {
  FilmstripFrame,
  FilmstripTransition,
  TransitionState,
} from '../../components/shared/filmstrip_transition';
import { ObservabilityOnboardingHeaderActionMenu } from '../../components/app/header_action_menu';

interface Props {
  children: React.ReactNode;
}

export function CustomLogs({ children }: Props) {
  useBreadcrumbs(
    [
      {
        text: i18n.translate(
          'xpack.observability_onboarding.breadcrumbs.customLogs',
          { defaultMessage: 'Stream log files' }
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
  const [title, setTitle] = useState<string>();
  const TransitionComponent = useRef<ComponentType>(() => null);

  const {
    services: { config },
  } = useKibana<ObservabilityOnboardingPluginContextValue>();

  const isServerless = config.serverless.enabled;

  function onChangeStep({
    direction,
    stepTitle,
    StepComponent,
  }: {
    direction: 'back' | 'next';
    stepTitle?: string;
    StepComponent: ComponentType;
  }) {
    setTransition(direction);
    setTitle(stepTitle);
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
          <EuiFlexGroup direction="row">
            <EuiFlexItem grow={false}>
              <EuiTitle
                size="l"
                data-test-subj="obltOnboardingStreamLogFilePageHeader"
              >
                <h1>
                  {title
                    ? title
                    : i18n.translate(
                        'xpack.observability_onboarding.title.collectCustomLogs',
                        {
                          defaultMessage: 'Stream log files to Elastic',
                        }
                      )}
                </h1>
              </EuiTitle>
            </EuiFlexItem>
            {isServerless && (
              <EuiFlexItem
                grow={false}
                css={{ position: 'absolute', right: 10 }}
              >
                <ObservabilityOnboardingHeaderActionMenu />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={1} style={{ width: '50%' }}>
          <FilmstripTransition
            duration={TRANSITION_DURATION}
            transition={transition}
          >
            <FilmstripFrame
              position={
                transition === 'ready'
                  ? 'center'
                  : transition === 'back'
                  ? 'left'
                  : 'right'
              }
            >
              {children}
            </FilmstripFrame>
          </FilmstripTransition>
        </EuiFlexItem>
      </EuiFlexGroup>
    </WizardProvider>
  );
}
