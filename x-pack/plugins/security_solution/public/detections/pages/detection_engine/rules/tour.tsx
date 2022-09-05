/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText, EuiTourStep } from '@elastic/eui';
import React, { useCallback, useEffect, useState } from 'react';
import { RULES_MANAGEMENT_FEATURE_TOUR_STORAGE_KEY } from '../../../../../common/constants';
import { useKibana } from '../../../../common/lib/kibana';
import * as i18n from './translations';

export interface Props {
  children: React.ReactElement;
}

export const RulesPageTourComponent: React.FC<Props> = ({ children }) => {
  const tourConfig = {
    currentTourStep: 1,
    isTourActive: true,
    tourPopoverWidth: 300,
  };

  const { storage } = useKibana().services;

  const [tourState, setTourState] = useState(() => {
    const restoredTourState = storage.get(RULES_MANAGEMENT_FEATURE_TOUR_STORAGE_KEY);

    if (restoredTourState != null) {
      return restoredTourState;
    }
    return tourConfig;
  });

  const demoTourSteps = [
    {
      step: 1,
      title: i18n.NEW_TERMS_TOUR_TITLE,
      content: <EuiText>{i18n.NEW_TERMS_TOUR_CONTENT}</EuiText>,
    },
  ];
  const finishTour = useCallback(() => {
    setTourState({
      ...tourState,
      isTourActive: false,
    });
  }, [tourState]);

  useEffect(() => {
    storage.set(RULES_MANAGEMENT_FEATURE_TOUR_STORAGE_KEY, tourState);
  }, [tourState, storage]);

  return (
    <EuiTourStep
      content={demoTourSteps[0].content}
      isStepOpen={tourState.currentTourStep === 1 && tourState.isTourActive}
      minWidth={tourState.tourPopoverWidth}
      onFinish={finishTour}
      step={1}
      stepsTotal={demoTourSteps.length}
      subtitle={tourState.tourSubtitle}
      title={demoTourSteps[0].title}
      anchorPosition="rightUp"
    >
      {children}
    </EuiTourStep>
  );
};
