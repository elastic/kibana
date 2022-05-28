/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiStatelessTourStep,
  EuiText,
  EuiTourActions,
  EuiTourState,
  EuiTourStep,
  EuiTourStepProps,
  useEuiTour,
} from '@elastic/eui';
import { noop } from 'lodash';
import React, { FC, useEffect, useMemo, useState } from 'react';
import { RULES_MANAGEMENT_FEATURE_TOUR_STORAGE_KEY } from '../../../../../../../common/constants';
import { useKibana } from '../../../../../../common/lib/kibana';
import * as i18n from './translations';

export interface RulesFeatureTourContextType {
  steps: EuiTourStepProps[];
  actions: EuiTourActions;
}

export const SEARCH_CAPABILITIES_TOUR_ANCHOR = 'search-capabilities-tour-anchor';

const TOUR_POPOVER_WIDTH = 400;

const tourConfig: EuiTourState = {
  currentTourStep: 1,
  isTourActive: true,
  tourPopoverWidth: TOUR_POPOVER_WIDTH,
  tourSubtitle: i18n.TOUR_TITLE,
};

const stepsConfig: EuiStatelessTourStep[] = [
  {
    step: 1,
    title: i18n.SEARCH_CAPABILITIES_TITLE,
    content: <EuiText>{i18n.SEARCH_CAPABILITIES_DESCRIPTION}</EuiText>,
    stepsTotal: 1,
    children: <></>,
    onFinish: noop,
    maxWidth: TOUR_POPOVER_WIDTH,
  },
];

export const RulesFeatureTour: FC = () => {
  const { storage } = useKibana().services;

  const restoredState = useMemo<EuiTourState>(
    () => ({
      ...tourConfig,
      ...storage.get(RULES_MANAGEMENT_FEATURE_TOUR_STORAGE_KEY),
    }),
    [storage]
  );

  const [tourSteps, tourActions, tourState] = useEuiTour(stepsConfig, restoredState);

  useEffect(() => {
    const { isTourActive, currentTourStep } = tourState;
    storage.set(RULES_MANAGEMENT_FEATURE_TOUR_STORAGE_KEY, { isTourActive, currentTourStep });
  }, [tourState, storage]);

  const [shouldShowSearchCapabilitiesTour, setShouldShowSearchCapabilitiesTour] = useState(false);

  useEffect(() => {
    /**
     * Wait until the tour target elements are visible on the page and mount
     * EuiTourStep components only after that. Otherwise, the tours would never
     * show up on the page.
     */
    const observer = new MutationObserver(() => {
      if (document.querySelector(`#${SEARCH_CAPABILITIES_TOUR_ANCHOR}`)) {
        setShouldShowSearchCapabilitiesTour(true);
        observer.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  const enhancedSteps = useMemo(
    () =>
      tourSteps.map((item, index) => ({
        ...item,
        content: (
          <>
            {item.content}
            {tourSteps.length > 1 && (
              <>
                <EuiSpacer size="s" />
                <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon
                      iconType="arrowLeft"
                      aria-label={i18n.PREVIOUS_STEP_LABEL}
                      display="empty"
                      disabled={index === 0}
                      onClick={tourActions.decrementStep}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon
                      iconType="arrowRight"
                      aria-label={i18n.NEXT_STEP_LABEL}
                      display="base"
                      disabled={index === tourSteps.length - 1}
                      onClick={tourActions.incrementStep}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </>
            )}
          </>
        ),
      })),
    [tourSteps, tourActions]
  );

  return shouldShowSearchCapabilitiesTour ? (
    <EuiTourStep
      {...enhancedSteps[0]}
      /**
       * children={undefined} is needed to narrow down EuiTourStepProps. Without
       * it we get a TS error: Types of property 'anchor' are incompatible.
       */
      // eslint-disable-next-line react/no-children-prop
      children={undefined}
      anchor={`#${SEARCH_CAPABILITIES_TOUR_ANCHOR}`}
      anchorPosition="downCenter"
    />
  ) : null;
};
