/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  ComponentType,
  ReactNode,
  createContext,
  useContext,
  useState,
  useRef,
} from 'react';

interface WizardContext<T, StepKey extends string> {
  CurrentStep: ComponentType;
  goToStep: (step: StepKey) => void;
  goBack: () => void;
  getState: () => T;
  setState: (state: T) => void;
  getPath: () => StepKey[];
  getUsage: () => {
    timeSinceStart: number;
    navEvents: Array<{
      type: string;
      step: StepKey;
      timestamp: number;
      duration: number;
    }>;
  };
}

export function createWizardContext<
  T,
  StepKey extends string,
  InitialStepKey extends StepKey
>({
  initialState,
  initialStep,
  steps,
}: {
  initialState: T;
  initialStep: InitialStepKey;
  steps: Record<StepKey, ComponentType>;
}) {
  const context = createContext<WizardContext<T, StepKey>>({
    CurrentStep: () => null,
    goToStep: () => {},
    goBack: () => {},
    getState: () => initialState,
    setState: () => {},
    getPath: () => [],
    getUsage: () => ({ timeSinceStart: 0, navEvents: [] }),
  });

  function Provider({
    children,
    onChangeStep,
    transitionDuration,
  }: {
    children?: ReactNode;
    onChangeStep?: (stepChangeEvent: {
      direction: 'back' | 'next';
      stepKey: StepKey;
      StepComponent: ComponentType;
    }) => void;
    transitionDuration?: number;
  }) {
    const [step, setStep] = useState<StepKey>(initialStep);
    const pathRef = useRef<StepKey[]>([initialStep]);
    const usageRef = useRef<ReturnType<WizardContext<T, StepKey>['getUsage']>>({
      timeSinceStart: 0,
      navEvents: [
        { type: 'initial', step, timestamp: Date.now(), duration: 0 },
      ],
    });
    const [state, setState] = useState<T>(initialState);
    return (
      <context.Provider
        value={{
          CurrentStep: steps[step],
          goToStep(stepKey: StepKey) {
            if (stepKey === step) {
              return;
            }
            pathRef.current.push(stepKey);
            const navEvents = usageRef.current.navEvents;
            const currentNavEvent = navEvents[navEvents.length - 1];
            const timestamp = Date.now();
            currentNavEvent.duration = timestamp - currentNavEvent.timestamp;
            usageRef.current.navEvents.push({
              type: 'progress',
              step: stepKey,
              timestamp,
              duration: 0,
            });
            if (onChangeStep) {
              onChangeStep({
                direction: 'next',
                stepKey,
                StepComponent: steps[stepKey],
              });
            }
            if (transitionDuration) {
              setTimeout(() => {
                setStep(stepKey);
              }, transitionDuration);
            } else {
              setStep(stepKey);
            }
          },
          goBack() {
            if (step === initialStep) {
              return;
            }
            const path = pathRef.current;
            path.pop();
            const lastStep = path[path.length - 1];
            const navEvents = usageRef.current.navEvents;
            const currentNavEvent = navEvents[navEvents.length - 1];
            const timestamp = Date.now();
            currentNavEvent.duration = timestamp - currentNavEvent.timestamp;
            usageRef.current.navEvents.push({
              type: 'back',
              step: lastStep,
              timestamp,
              duration: 0,
            });
            if (onChangeStep) {
              onChangeStep({
                direction: 'back',
                stepKey: lastStep,
                StepComponent: steps[lastStep],
              });
            }
            if (transitionDuration) {
              setTimeout(() => {
                setStep(lastStep);
              }, transitionDuration);
            } else {
              setStep(lastStep);
            }
          },
          getState: () => state as T,
          setState: (_state: T) => {
            setState(_state);
          },
          getPath: () => [...pathRef.current],
          getUsage: () => {
            const currentTime = Date.now();
            const navEvents = usageRef.current.navEvents;
            const firstNavEvent = navEvents[0];
            const lastNavEvent = navEvents[navEvents.length - 1];
            lastNavEvent.duration = currentTime - lastNavEvent.timestamp;
            return {
              timeSinceStart: currentTime - firstNavEvent.timestamp,
              navEvents,
            };
          },
        }}
      >
        {children}
      </context.Provider>
    );
  }

  function Step() {
    const { CurrentStep } = useContext(context);
    return <CurrentStep />;
  }

  function useWizard() {
    const { CurrentStep: _, ...rest } = useContext(context);
    return rest;
  }

  return { context, Provider, Step, useWizard };
}
