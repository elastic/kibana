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

import type { FC } from 'react';
import React, { useCallback, useState, useEffect } from 'react';
import { EuiButton, EuiButtonEmpty, EuiTourStep } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { tourConfig, type TourState } from '../utils/tour_step_config';
import type { FlyoutTourStepsProps } from '../utils/tour_step_config';
import { NEW_FEATURES_TOUR_STORAGE_KEYS } from '../../../../../common/constants';
import { useKibana } from '../../../../common/lib/kibana';
import { FLYOUT_TOUR_TEST_ID } from './test_ids';

export interface FlyoutTourProps {
  /**
   * Content to be displayed in each tour card
   */
  tourStepContent: FlyoutTourStepsProps[];
  /**
   * Total number of tour steps
   */
  totalSteps: number;
  /**
   * Callback to go to overview tab before tour
   */
  goToOverviewTab?: () => void;
  /**
   * Callback to go to open left panel
   */
  goToLeftPanel?: () => void;
}

const MAX_POPOVER_WIDTH = 500;
const TOUR_SUBTITLE = i18n.translate('xpack.securitySolution.flyout.tour.subtitle', {
  defaultMessage: 'A redesigned alert experience',
});

/**
 * Shared component that generates tour steps based on supplied tour step content.
 * Supports tours being shown in different panels and manages state via local storage
 */
export const FlyoutTour: FC<FlyoutTourProps> = ({
  tourStepContent,
  totalSteps,
  goToOverviewTab,
  goToLeftPanel,
}) => {
  const {
    services: { storage },
  } = useKibana();

  const [tourState, setTourState] = useState<TourState>(() => {
    const restoredTourState = storage.get(NEW_FEATURES_TOUR_STORAGE_KEYS.FLYOUT);
    if (restoredTourState != null) {
      return restoredTourState;
    }
    return tourConfig;
  });

  useEffect(() => {
    storage.set(NEW_FEATURES_TOUR_STORAGE_KEYS.FLYOUT, tourState);
    if (tourState.isTourActive && tourState.currentTourStep === 1 && goToOverviewTab) {
      goToOverviewTab();
    }
  }, [storage, tourState, goToOverviewTab]);

  const nextStep = useCallback(() => {
    setTourState((prev) => {
      if (prev.currentTourStep === 3 && goToLeftPanel) {
        goToLeftPanel();
      }
      return {
        ...prev,
        currentTourStep: prev.currentTourStep + 1,
      };
    });
  }, [goToLeftPanel]);

  const finishTour = useCallback(() => {
    setTourState((prev) => {
      return {
        ...prev,
        isTourActive: false,
      };
    });
  }, []);

  const getFooterAction = useCallback(
    (step: number) => {
      // if it's the last step, we don't want to show the next button
      return step === totalSteps ? (
        <EuiButton color="success" size="s" onClick={finishTour}>
          {i18n.translate('xpack.securitySolution.flyout.tour.finish.text', {
            defaultMessage: 'Finish',
          })}
        </EuiButton>
      ) : (
        [
          <EuiButtonEmpty size="s" color="text" onClick={finishTour}>
            {i18n.translate('xpack.securitySolution.flyout.tour.exit.text', {
              defaultMessage: 'Exit',
            })}
          </EuiButtonEmpty>,
          <EuiButton color="success" size="s" onClick={nextStep}>
            {i18n.translate('xpack.securitySolution.flyout.tour.Next.text', {
              defaultMessage: 'Next',
            })}
          </EuiButton>,
        ]
      );
    },
    [finishTour, nextStep, totalSteps]
  );

  // Do not show tour if it is inactive
  if (!tourState.isTourActive) {
    return null;
  }

  return (
    <>
      {tourStepContent.map((steps) => {
        const stepCount = steps.stepNumber;
        if (tourState.currentTourStep !== stepCount) return null;
        const panelProps = {
          'data-test-subj': `${FLYOUT_TOUR_TEST_ID}-${stepCount}`,
        };

        return (
          <EuiTourStep
            panelProps={panelProps}
            key={stepCount}
            step={stepCount}
            isStepOpen={tourState.isTourActive}
            maxWidth={MAX_POPOVER_WIDTH}
            stepsTotal={totalSteps}
            onFinish={finishTour}
            title={steps.title}
            content={steps.content}
            anchor={`[data-test-subj=${steps.anchor}]`}
            anchorPosition={steps.anchorPosition}
            footerAction={getFooterAction(stepCount)}
            subtitle={TOUR_SUBTITLE}
          />
        );
      })}
    </>
  );
};

FlyoutTour.displayName = 'FlyoutTour';
