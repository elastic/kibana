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

import React, { useCallback, useEffect, useState } from 'react';
import { EuiButton, EuiButtonEmpty, EuiTourStep } from '@elastic/eui';
import { useRouteSpy } from '../../common/utils/route/use_route_spy';
import { VideoToast } from './video_toast';
import { useIsElementMounted } from '../../detection_engine/rule_management_ui/components/rules_table/rules_table/guided_onboarding/use_is_element_mounted';
import { NEW_FEATURES_TOUR_STORAGE_KEYS, SecurityPageName } from '../../../common/constants';
import { useKibana, useNavigation } from '../../common/lib/kibana';
import { attackDiscoveryTourSteps, tourConfig } from './step_config';
import * as i18n from './translations';

interface TourState {
  currentTourStep: number;
  isTourActive: boolean;
}

const AttackDiscoveryTourComp = () => {
  const {
    services: { storage },
  } = useKibana();

  const { navigateTo } = useNavigation();
  const [{ pageName }] = useRouteSpy();
  const [tourState, setTourState] = useState<TourState>(
    storage.get(NEW_FEATURES_TOUR_STORAGE_KEYS.ATTACK_DISCOVERY) ?? tourConfig
  );

  useEffect(() => {
    if (tourState.isTourActive && pageName === SecurityPageName.attackDiscovery) {
      setTourState((prev) => {
        storage.set(NEW_FEATURES_TOUR_STORAGE_KEYS.ATTACK_DISCOVERY, {
          ...prev,
          currentTourStep: 2,
        });
        return {
          ...prev,
          currentTourStep: 2,
        };
      });
    }
  }, [pageName, storage, tourState.isTourActive]);

  const finishTour = useCallback(() => {
    setTourState((prev) => {
      storage.set(NEW_FEATURES_TOUR_STORAGE_KEYS.ATTACK_DISCOVERY, {
        ...prev,
        isTourActive: false,
      });
      return {
        ...prev,
        isTourActive: false,
      };
    });
  }, [storage]);

  const navigateToAttackDiscovery = useCallback(() => {
    navigateTo({
      deepLinkId: SecurityPageName.attackDiscovery,
    });
  }, [navigateTo]);

  const nextStep = useCallback(() => {
    setTourState((prev) => {
      if (prev.currentTourStep === 1) {
        navigateToAttackDiscovery();
      }
      storage.set(NEW_FEATURES_TOUR_STORAGE_KEYS.ATTACK_DISCOVERY, {
        ...prev,
        currentTourStep: prev.currentTourStep + 1,
      });
      return {
        ...prev,
        currentTourStep: prev.currentTourStep + 1,
      };
    });
  }, [navigateToAttackDiscovery, storage]);

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
          'data-test-subj': `attackDiscovery-tour-step-${stepCount}`,
        };
        return tourState.currentTourStep === 1 ? (
          <EuiTourStep
            anchor={`#${steps.anchor}`}
            content={steps.content}
            footerAction={getFooterAction()}
            isStepOpen={tourState.isTourActive && tourState.currentTourStep === stepCount}
            key={idx}
            maxWidth={450}
            onFinish={finishTour}
            panelProps={panelProps}
            repositionOnScroll
            step={stepCount}
            stepsTotal={1}
            title={steps.title}
          />
        ) : (
          pageName === SecurityPageName.attackDiscovery && <VideoToast onClose={finishTour} />
        );
      })}
    </>
  );
};

export const AttackDiscoveryTour = React.memo(AttackDiscoveryTourComp);
