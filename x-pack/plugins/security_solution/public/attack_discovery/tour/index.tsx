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

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiButton, EuiButtonEmpty, EuiTourStep } from '@elastic/eui';
import { useRouteSpy } from '../../common/utils/route/use_route_spy';
import { VideoToast } from './video_toast';
import { useIsElementMounted } from '../../detection_engine/rule_management_ui/components/rules_table/rules_table/guided_onboarding/use_is_element_mounted';
import { NEW_FEATURES_TOUR_STORAGE_KEYS, SecurityPageName } from '../../../common/constants';
import { useKibana, useNavigation } from '../../common/lib/kibana';
import { attackDiscoveryTourStepOne, tourConfig } from './step_config';
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

  const advanceToVideoStep = useCallback(() => {
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
  }, [storage]);

  useEffect(() => {
    if (tourState.isTourActive && pageName === SecurityPageName.attackDiscovery) {
      advanceToVideoStep();
    }
  }, [advanceToVideoStep, pageName, tourState.isTourActive]);

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
    if (tourState.currentTourStep === 1) {
      navigateToAttackDiscovery();
      advanceToVideoStep();
    }
  }, [tourState.currentTourStep, navigateToAttackDiscovery, advanceToVideoStep]);

  const footerAction = useMemo(
    () => [
      // if exit, set tour to the video step without navigating to the page
      <EuiButtonEmpty size="s" color="text" onClick={advanceToVideoStep}>
        {i18n.ATTACK_DISCOVERY_TOUR_EXIT}
      </EuiButtonEmpty>,
      // if next, set tour to the video step and navigate to the page
      <EuiButton color="success" size="s" onClick={nextStep}>
        {i18n.ATTACK_DISCOVERY_TRY_IT}
      </EuiButton>,
    ],
    [advanceToVideoStep, nextStep]
  );

  const isElementAtCurrentStepMounted = useIsElementMounted(attackDiscoveryTourStepOne?.anchor);

  const isTestAutomation =
    window.Cypress != null || // TODO: temporary workaround to disable the tour when running in Cypress, because the tour breaks other projects Cypress tests
    navigator.webdriver === true; // TODO: temporary workaround to disable the tour when running in the FTR, because the tour breaks other projects FTR tests

  if (
    isTestAutomation ||
    !tourState.isTourActive ||
    (tourState.currentTourStep === 1 && !isElementAtCurrentStepMounted)
  ) {
    return null;
  }

  return tourState.currentTourStep === 1 ? (
    <EuiTourStep
      anchor={`#${attackDiscoveryTourStepOne.anchor}`}
      content={attackDiscoveryTourStepOne.content}
      footerAction={footerAction}
      isStepOpen
      maxWidth={450}
      onFinish={advanceToVideoStep}
      panelProps={{
        'data-test-subj': `attackDiscovery-tour-step-1`,
      }}
      repositionOnScroll
      step={1}
      stepsTotal={1}
      title={attackDiscoveryTourStepOne.title}
    />
  ) : pageName === SecurityPageName.attackDiscovery ? (
    <VideoToast onClose={finishTour} />
  ) : null;
};

export const AttackDiscoveryTour = React.memo(AttackDiscoveryTourComp);
