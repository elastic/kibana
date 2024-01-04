/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * This timeline tour only valid for 8.12 release is not needed for 8.13
 *
 * */

import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { EuiButton, EuiButtonEmpty, EuiTourStep } from '@elastic/eui';
import type { TimelineType } from '../../../../../common/api/timeline';
import type { TimelineTabs } from '../../../../../common/types';
import { useIsElementMounted } from '../../../../detection_engine/rule_management_ui/components/rules_table/rules_table/guided_onboarding/use_is_element_mounted';
import { NEW_FEATURES_TOUR_STORAGE_KEYS } from '../../../../../common/constants';
import { useKibana } from '../../../../common/lib/kibana';
import { timelineTourSteps, tourConfig } from './step_config';
import * as i18n from './translations';

interface TourState {
  currentTourStep: number;
  isTourActive: boolean;
  tourPopoverWidth: number;
  tourSubtitle: string;
}

export interface TimelineTourProps {
  activeTab: TimelineTabs;
  timelineType: TimelineType;
  switchToTab: (tab: TimelineTabs) => void;
}

const TimelineTourComp = (props: TimelineTourProps) => {
  const { activeTab, switchToTab, timelineType } = props;
  const {
    services: { storage },
  } = useKibana();

  const updatedTourSteps = useMemo(
    () =>
      timelineTourSteps.filter((step) => !step.timelineType || step.timelineType === timelineType),
    [timelineType]
  );

  const [tourState, setTourState] = useState<TourState>(() => {
    const restoredTourState = storage.get(NEW_FEATURES_TOUR_STORAGE_KEYS.TIMELINE);
    if (restoredTourState != null) {
      return restoredTourState;
    }
    return tourConfig;
  });

  const finishTour = useCallback(() => {
    setTourState((prev) => {
      return {
        ...prev,
        isTourActive: false,
      };
    });
  }, []);

  const nextStep = useCallback(() => {
    setTourState((prev) => {
      return {
        ...prev,
        currentTourStep: prev.currentTourStep + 1,
      };
    });
  }, []);

  useEffect(() => {
    storage.set(NEW_FEATURES_TOUR_STORAGE_KEYS.TIMELINE, tourState);
  }, [tourState, storage]);

  const getFooterAction = useCallback(
    (step: number) => {
      // if it's the last step, we don't want to show the next button
      return step === updatedTourSteps.length ? (
        <EuiButton color="success" size="s" onClick={finishTour}>
          {i18n.TIMELINE_TOUR_FINISH}
        </EuiButton>
      ) : (
        [
          <EuiButtonEmpty size="s" color="text" onClick={finishTour}>
            {i18n.TIMELINE_TOUR_EXIT}
          </EuiButtonEmpty>,
          <EuiButton color="success" size="s" onClick={nextStep}>
            {i18n.TIMELINE_TOUR_NEXT}
          </EuiButton>,
        ]
      );
    },
    [finishTour, nextStep, updatedTourSteps.length]
  );

  const nextEl = updatedTourSteps[tourState.currentTourStep - 1]?.anchor;

  const isElementAtCurrentStepMounted = useIsElementMounted(nextEl);

  const currentStepConfig = updatedTourSteps[tourState.currentTourStep - 1];

  if (currentStepConfig?.timelineTab && currentStepConfig.timelineTab !== activeTab) {
    switchToTab(currentStepConfig.timelineTab);
  }

  if (!tourState.isTourActive || !isElementAtCurrentStepMounted) {
    return null;
  }

  return (
    <>
      {updatedTourSteps.map((steps, idx) => {
        const stepCount = idx + 1;
        if (tourState.currentTourStep !== stepCount) return null;
        const panelProps = {
          'data-test-subj': `timeline-tour-step-${idx + 1}`,
        };
        return (
          <EuiTourStep
            panelProps={panelProps}
            key={idx}
            step={stepCount}
            isStepOpen={tourState.isTourActive && tourState.currentTourStep === idx + 1}
            minWidth={tourState.tourPopoverWidth}
            stepsTotal={updatedTourSteps.length}
            onFinish={finishTour}
            title={steps.title}
            content={steps.content}
            anchor={`#${steps.anchor}`}
            subtitle={tourConfig.tourSubtitle}
            footerAction={getFooterAction(stepCount)}
          />
        );
      })}
    </>
  );
};

export const TimelineTour = React.memo(TimelineTourComp);
