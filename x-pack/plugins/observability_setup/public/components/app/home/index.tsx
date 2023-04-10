import React, { ComponentType, useState, useRef } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import {
  Provider as WizardProvider,
  Step as WizardStep,
} from './logs_onboarding_wizard';
import {
  FilmstripTransition,
  FilmstripFrame,
  TransitionState,
} from '../../shared/filmstrip_transition';
import { HorizontalSteps } from './logs_onboarding_wizard/horizontal_steps';
import { PageTitle } from './logs_onboarding_wizard/page_title';

export function Home({ animated = true }: { animated?: boolean }) {
  if (animated) {
    return <AnimatedTransitionsWizard />;
  }
  return <StillTransitionsWizard />;
}

function StillTransitionsWizard() {
  return (
    <WizardProvider>
      <EuiFlexGroup alignItems="center" justifyContent="spaceAround">
        <EuiFlexItem grow={false}>
          <WizardStep />
        </EuiFlexItem>
      </EuiFlexGroup>
    </WizardProvider>
  );
}

const TRANSITION_DURATION = 180;

function AnimatedTransitionsWizard() {
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
          <PageTitle />
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
              {transition === 'back' ? <TransitionComponent.current /> : null}
            </FilmstripFrame>
            <FilmstripFrame position="center">
              <WizardStep />
            </FilmstripFrame>
            <FilmstripFrame position="right">
              {transition === 'next' ? <TransitionComponent.current /> : null}
            </FilmstripFrame>
          </FilmstripTransition>
        </EuiFlexItem>
      </EuiFlexGroup>
    </WizardProvider>
  );
}
