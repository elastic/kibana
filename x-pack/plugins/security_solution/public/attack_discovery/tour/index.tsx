/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * The attack discovery tour for 8.14
 *
 * */

import React, { useEffect, useCallback, useState } from 'react';
import { EuiButton, EuiButtonEmpty, EuiTourStep } from '@elastic/eui';
import { useIsElementMounted } from '../../detection_engine/rule_management_ui/components/rules_table/rules_table/guided_onboarding/use_is_element_mounted';
import { NEW_FEATURES_TOUR_STORAGE_KEYS, SecurityPageName } from '../../../common/constants';
import { useKibana, useNavigation } from '../../common/lib/kibana';
import { attackDiscoveryTourSteps, tourConfig } from './step_config';
import * as i18n from './translations';

interface TourState {
  currentTourStep: number;
  isTourActive: boolean;
  tourPopoverWidth: number;
}

const AttackDiscoveryTourComp = () => {
  const {
    services: { storage },
  } = useKibana();

  const { navigateTo } = useNavigation();
  const [tourState, setTourState] = useState<TourState>(
    storage.get(NEW_FEATURES_TOUR_STORAGE_KEYS.ATTACK_DISCOVERY) ?? tourConfig
  );

  const finishTour = useCallback(() => {
    setTourState((prev) => {
      return {
        ...prev,
        isTourActive: false,
      };
    });
  }, []);

  const navigateToAttackDiscovery = useCallback(() => {
    navigateTo({
      deepLinkId: SecurityPageName.attackDiscovery,
    });
  }, [navigateTo]);

  const nextStep = useCallback(() => {
    if (tourState.currentTourStep === 1) {
      navigateToAttackDiscovery();
    }
    setTourState((prev) => {
      storage.set(NEW_FEATURES_TOUR_STORAGE_KEYS.ATTACK_DISCOVERY, {
        ...prev,
        currentTourStep: prev.currentTourStep + 1,
      });
      console.log('setCurrentTourStep to: ', prev.currentTourStep + 1);
      return {
        ...prev,
        currentTourStep: prev.currentTourStep + 1,
      };
    });
  }, [navigateToAttackDiscovery, storage, tourState.currentTourStep]);

  useEffect(() => {
    storage.set(NEW_FEATURES_TOUR_STORAGE_KEYS.ATTACK_DISCOVERY, tourState);
    console.log('tourState', tourState);
  }, [tourState, storage]);

  const getFooterAction = useCallback(() => {
    // if it's the last step, we don't want to show the next button
    return [
      <EuiButtonEmpty size="s" color="text" onClick={finishTour}>
        {i18n.ATTACK_DISCOVERY_TOUR_EXIT}
      </EuiButtonEmpty>,
      <EuiButton color="success" size="s" onClick={nextStep}>
        {i18n.ATTACK_DISCOVERY_TRY_IT}
      </EuiButton>,
    ];
  }, [finishTour, nextStep]);

  const nextEl = attackDiscoveryTourSteps[tourState.currentTourStep - 1]?.anchor;
  const isElementAtCurrentStepMounted = useIsElementMounted(nextEl);

  if (!tourState.isTourActive || !isElementAtCurrentStepMounted) {
    return null;
  }

  return (
    <>
      {attackDiscoveryTourSteps.map((steps, idx) => {
        const stepCount = idx + 1;
        if (tourState.currentTourStep !== stepCount) return null;
        const panelProps = {
          'data-test-subj': `attackDiscovery-tour-step-${idx + 1}`,
        };
        return (
          <EuiTourStep
            panelProps={panelProps}
            key={idx}
            step={stepCount}
            isStepOpen={tourState.isTourActive && tourState.currentTourStep === idx + 1}
            maxWidth={tourState.tourPopoverWidth}
            stepsTotal={2}
            onFinish={finishTour}
            title={steps.title}
            content={steps.content}
            anchor={`#${steps.anchor}`}
            footerAction={getFooterAction()}
          />
        );
      })}
    </>
  );
};

export const AttackDiscoveryTour = React.memo(AttackDiscoveryTourComp);
