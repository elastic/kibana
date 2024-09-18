/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EuiStatelessTourStep,
  EuiTourActions,
  EuiTourState,
  EuiTourStepProps,
} from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTourStep,
  useEuiTour,
} from '@elastic/eui';
import { noop } from 'lodash';
import type { FC } from 'react';
import React, { useEffect, useMemo } from 'react';
import { NEW_FEATURES_TOUR_STORAGE_KEYS } from '../../../../../../common/constants';
import { useKibana } from '../../../../../common/lib/kibana';
import { useIsElementMounted } from '../rules_table/guided_onboarding/use_is_element_mounted';
import { PREBUILT_RULE_UPDATE_FLYOUT_ANCHOR } from '../upgrade_prebuilt_rules_table/upgrade_prebuilt_rules_table_context';
import * as i18n from './translations';

export interface RulesFeatureTourContextType {
  steps: EuiTourStepProps[];
  actions: EuiTourActions;
}

export const PER_FIELD_UPGRADE_TOUR_ANCHOR = 'updates';

const TOUR_STORAGE_KEY = NEW_FEATURES_TOUR_STORAGE_KEYS.RULE_MANAGEMENT_PAGE;
const TOUR_POPOVER_WIDTH = 400;

const tourConfig: EuiTourState = {
  currentTourStep: 1,
  isTourActive: true,
  tourPopoverWidth: TOUR_POPOVER_WIDTH,
  tourSubtitle: '',
};

const stepsConfig: EuiStatelessTourStep[] = [
  {
    step: 1,
    title: i18n.UPDATE_TOUR_TITLE,
    content: <EuiText>{i18n.UPDATE_TOUR_DESCRIPTION}</EuiText>,
    stepsTotal: 1,
    children: <></>,
    onFinish: noop,
    maxWidth: TOUR_POPOVER_WIDTH,
  },
];

export const RuleFeatureTour: FC = () => {
  const { storage } = useKibana().services;

  const restoredState = useMemo<EuiTourState>(
    () => ({
      ...tourConfig,
      ...storage.get(TOUR_STORAGE_KEY),
    }),
    [storage]
  );

  const [tourSteps, tourActions, tourState] = useEuiTour(stepsConfig, restoredState);

  useEffect(() => {
    const { isTourActive, currentTourStep } = tourState;
    storage.set(TOUR_STORAGE_KEY, { isTourActive, currentTourStep });
  }, [tourState, storage]);

  const isTourAnchorMounted = useIsElementMounted(PER_FIELD_UPGRADE_TOUR_ANCHOR);
  const isFlyoutOpen = useIsElementMounted(PREBUILT_RULE_UPDATE_FLYOUT_ANCHOR);
  const shouldShowRuleUpgradeTour = isTourAnchorMounted && !isFlyoutOpen;

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

  return shouldShowRuleUpgradeTour ? (
    <EuiTourStep
      {...enhancedSteps[0]}
      /**
       * children={undefined} is needed to narrow down EuiTourStepProps. Without
       * it we get a TS error: Types of property 'anchor' are incompatible.
       */
      // eslint-disable-next-line react/no-children-prop
      children={undefined}
      anchor={`#${PER_FIELD_UPGRADE_TOUR_ANCHOR}`}
      anchorPosition="downCenter"
    />
  ) : null;
};
