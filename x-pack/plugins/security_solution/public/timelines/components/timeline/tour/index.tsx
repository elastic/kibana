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

import React, { useEffect, useCallback, useState } from 'react';
import { EuiButton, EuiButtonEmpty, EuiTourStep } from '@elastic/eui';
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

const TimelineTourComp = () => {
  const {
    services: { storage },
  } = useKibana();

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
      return step === timelineTourSteps.length ? (
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
    [finishTour, nextStep]
  );

  const nextEl = timelineTourSteps[tourState.currentTourStep - 1]?.anchor;

  const isElementAtCurrentStepMounted = useIsElementMounted(nextEl);

  if (!tourState.isTourActive || !isElementAtCurrentStepMounted) {
    return null;
  }

  return (
    <>
      {timelineTourSteps.map((steps, idx) => {
        if (tourState.currentTourStep !== idx + 1) return null;
        return (
          <EuiTourStep
            panelProps={{
              'data-test-subj': `timeline-tour-step-${idx + 1}`,
            }}
            key={idx}
            step={steps.step}
            isStepOpen={tourState.isTourActive && tourState.currentTourStep === idx + 1}
            minWidth={tourState.tourPopoverWidth}
            stepsTotal={timelineTourSteps.length}
            onFinish={finishTour}
            title={steps.title}
            content={steps.content}
            anchor={`#${steps.anchor}`}
            subtitle={tourConfig.tourSubtitle}
            footerAction={getFooterAction(steps.step)}
          />
        );
      })}
    </>
  );
};

export const TimelineTour = React.memo(TimelineTourComp);
