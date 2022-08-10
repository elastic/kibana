/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiTourStep } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { NEW_TERMS_TOUR_ACTIVE_KEY } from '../../../../../common/constants';
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

  const [tourState, setTourState] = useState(() => {
    const tourStateString = localStorage.getItem(NEW_TERMS_TOUR_ACTIVE_KEY);

    if (tourStateString != null) {
      return JSON.parse(tourStateString);
    }
    return tourConfig;
  });

  const demoTourSteps = [
    {
      step: 1,
      title: i18n.NEW_TERMS_TOUR_TITLE,
      content: (
        <span>
          <p>{i18n.NEW_TERMS_TOUR_CONTENT}</p>
          <EuiSpacer />
        </span>
      ),
    },
  ];
  const finishTour = () => {
    setTourState({
      ...tourState,
      isTourActive: false,
    });
  };

  useEffect(() => {
    localStorage.setItem(NEW_TERMS_TOUR_ACTIVE_KEY, JSON.stringify(tourState));
  }, [tourState]);

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
