/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noop } from 'lodash';
import type { FC } from 'react';
import React, { useEffect, useMemo, useState } from 'react';

import type { EuiTourState } from '@elastic/eui';
import { EuiSpacer, EuiTourStep, useEuiTour } from '@elastic/eui';

import { NEW_FEATURES_TOUR_STORAGE_KEYS } from '../../../../../common/constants';
import { useKibana } from '../../../../common/lib/kibana';

import * as i18n from './translations';

const TOUR_STORAGE_KEY = NEW_FEATURES_TOUR_STORAGE_KEYS.RULE_CREATION_PAGE_DEFINE_STEP;
const TOUR_POPOVER_WIDTH = 300;

const tourConfig: EuiTourState = {
  currentTourStep: 1,
  isTourActive: true,
  tourPopoverWidth: TOUR_POPOVER_WIDTH,
  tourSubtitle: '',
};

const stepsConfig = [
  {
    step: 1,
    title: i18n.DATA_SOURCE_GUIDE_TITLE,
    content: (
      <span>
        <p>{i18n.DATA_SOURCE_GUIDE_CONTENT}</p>
        <EuiSpacer />
      </span>
    ),
    anchor: `#dataSourceSelector`,
    anchorPosition: 'rightCenter' as const,
    stepsTotal: 1,
    onFinish: noop,
  },
];

export const StepDefineRuleNewFeaturesTour: FC = () => {
  const { storage } = useKibana().services;

  const restoredState = useMemo<EuiTourState>(
    () => ({
      ...tourConfig,
      ...storage.get(TOUR_STORAGE_KEY),
    }),
    [storage]
  );

  const [tourSteps, , tourState] = useEuiTour(stepsConfig, restoredState);

  useEffect(() => {
    const { isTourActive, currentTourStep } = tourState;
    storage.set(TOUR_STORAGE_KEY, { isTourActive, currentTourStep });
  }, [tourState, storage]);

  const [shouldShowTour, setShouldShowTour] = useState(false);

  useEffect(() => {
    /**
     * Wait until the tour target elements are visible on the page and mount
     * EuiTourStep components only after that. Otherwise, the tours would never
     * show up on the page.
     */
    const observer = new MutationObserver(() => {
      if (document.querySelector(stepsConfig[0].anchor)) {
        setShouldShowTour(true);
        observer.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  return shouldShowTour ? <EuiTourStep {...tourSteps[0]} /> : null;
};
