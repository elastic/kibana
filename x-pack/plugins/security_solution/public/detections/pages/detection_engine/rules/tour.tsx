/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactChild } from 'react';
import React, { useState, useCallback } from 'react';

import type { EuiTourStepProps } from '@elastic/eui';
import { EuiTourStep, useIsWithinBreakpoints } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const NEW_TERMS_TOUR_ACTIVE_KEY = 'security.newTermsTourActive';

const getIsTourActiveFromLocalStorage = (): boolean => {
  return Boolean(localStorage.getItem(NEW_TERMS_TOUR_ACTIVE_KEY));
};
const saveIsTourActiveToLocalStorage = (isTourActive: boolean): void => {
  localStorage.setItem(NEW_TERMS_TOUR_ACTIVE_KEY, JSON.stringify(isTourActive));
};

const minWidth: EuiTourStepProps['minWidth'] = 360;
const maxWidth: EuiTourStepProps['maxWidth'] = 360;
const offset: EuiTourStepProps['offset'] = 20;
const repositionOnScroll: EuiTourStepProps['repositionOnScroll'] = true;

export const TourContextProvider = ({ children }: { children: ReactChild }) => {
  const [isTourActive, _setIsTourActive] = useState<boolean>(true);
  const setIsTourActive = useCallback((value: boolean) => {
    _setIsTourActive(value);
    saveIsTourActiveToLocalStorage(value);
  }, []);

  const resetTour = useCallback(() => {
    setIsTourActive(false);
  }, [setIsTourActive]);

  const isSmallScreen = useIsWithinBreakpoints(['xs', 's']);
  const showTour = isTourActive && !isSmallScreen;
  return (
    <div>
      {children}
      {showTour && (
        
          <EuiTourStep
            step={1}
            title={i18n.translate(
              'xpack.securitySolution.detectionEngine.rules.tour.newTermsTitle',
              {
                defaultMessage: 'Welcome to Elastic Security',
              }
            )}
            content={i18n.translate(
              'xpack.securitySolution.detectionEngine.rules.tour.newTermsContent',
              {
                defaultMessage: 'A new type of rule is available for creation',
              }
            )}
            anchor={`[data-test-subj="create-new-rule"]`}
            anchorPosition={'downCenter'}
            data-test-subj={'newTermsTourStep'}
            stepsTotal={1}
            minWidth={minWidth}
            maxWidth={maxWidth}
            offset={offset}
            repositionOnScroll={repositionOnScroll}
            isStepOpen={true}
            onFinish={() => resetTour()}
          />
          
        
      )}
    </div>
  );
};


/**
 * {/* <EuiTourStep
            step={2}
            title={'hello world'}
            content={'nice'}
            anchor={`[data-test-subj="dataViewIndexPatternButtonGroup"]`}
            anchorPosition={'downCenter'}
            data-test-subj={'dataViewTour'}
            stepsTotal={1}
            minWidth={minWidth}
            maxWidth={maxWidth}
            offset={offset}
            repositionOnScroll={repositionOnScroll}
            isStepOpen={true}
            onFinish={() => resetTour()}
          /> */}
 */