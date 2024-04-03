/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { AttachmentType } from '@kbn/cases-plugin/common';
import type { CaseAttachmentsWithoutOwner } from '@kbn/cases-plugin/public';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { APP_ID } from '../../../../../common';
import { CasesTourSteps } from '../../../../common/components/guided_onboarding_tour/cases_tour_steps';
import {
  AlertsCasesTourSteps,
  sampleCase,
  SecurityStepId,
} from '../../../../common/components/guided_onboarding_tour/tour_config';
import { useTourContext } from '../../../../common/components/guided_onboarding_tour';
import { useKibana } from '../../../../common/lib/kibana';
import type { TimelineNonEcsData } from '../../../../../common/search_strategy';
import { ADD_TO_EXISTING_CASE, ADD_TO_NEW_CASE } from '../translations';
import type { AlertTableContextMenuItem } from '../types';

export interface UseAddToCaseActions {
  onMenuItemClick: () => void;
  ariaLabel?: string;
  ecsData?: Ecs;
  nonEcsData?: TimelineNonEcsData[];
  onSuccess?: () => Promise<void>;
  isActiveTimelines: boolean;
  isInDetections: boolean;
  refetch?: (() => void) | undefined;
}

export const useAddToCaseActions = ({
  onMenuItemClick,
  ariaLabel,
  ecsData,
  nonEcsData,
  onSuccess,
  isActiveTimelines,
  isInDetections,
  refetch,
}: UseAddToCaseActions) => {
  const { cases: casesUi } = useKibana().services;
  const userCasesPermissions = casesUi.helpers.canUseCases([APP_ID]);

  const isAlert = useMemo(() => {
    return ecsData?.event?.kind?.includes('signal');
  }, [ecsData]);

  const caseAttachments: CaseAttachmentsWithoutOwner = useMemo(() => {
    return ecsData?._id
      ? [
          {
            alertId: ecsData?._id ?? '',
            index: ecsData?._index ?? '',
            type: AttachmentType.alert,
            rule: casesUi.helpers.getRuleIdFromEvent({ ecs: ecsData, data: nonEcsData ?? [] }),
          },
        ]
      : [];
  }, [casesUi.helpers, ecsData, nonEcsData]);

  const { activeStep, incrementStep, setStep, isTourShown } = useTourContext();

  const onCaseSuccess = () => {
    if (onSuccess) {
      onSuccess();
    }

    if (refetch) {
      refetch();
    }
  };

  const afterCaseCreated = useCallback(async () => {
    if (isTourShown(SecurityStepId.alertsCases)) {
      setStep(SecurityStepId.alertsCases, AlertsCasesTourSteps.viewCase);
    }
  }, [setStep, isTourShown]);

  const prefillCasesValue = useMemo(
    () =>
      isTourShown(SecurityStepId.alertsCases) &&
      (activeStep === AlertsCasesTourSteps.addAlertToCase ||
        activeStep === AlertsCasesTourSteps.createCase ||
        activeStep === AlertsCasesTourSteps.submitCase)
        ? { initialValue: sampleCase }
        : {},
    [activeStep, isTourShown]
  );

  const createCaseFlyout = casesUi.hooks.useCasesAddToNewCaseFlyout({
    onClose: onMenuItemClick,
    onSuccess: onCaseSuccess,
    afterCaseCreated,
    ...prefillCasesValue,
  });

  const selectCaseModal = casesUi.hooks.useCasesAddToExistingCaseModal({
    onClose: onMenuItemClick,
    onSuccess: onCaseSuccess,
  });

  const handleAddToNewCaseClick = useCallback(() => {
    // TODO rename this, this is really `closePopover()`
    onMenuItemClick();
    createCaseFlyout.open({
      attachments: caseAttachments,
      // activeStep will be AlertsCasesTourSteps.addAlertToCase on first render because not yet incremented
      // if the user closes the flyout without completing the form and comes back, we will be at step AlertsCasesTourSteps.createCase
      ...(isTourShown(SecurityStepId.alertsCases)
        ? {
            headerContent: <CasesTourSteps />,
          }
        : {}),
    });
    if (
      isTourShown(SecurityStepId.alertsCases) &&
      activeStep === AlertsCasesTourSteps.addAlertToCase
    ) {
      incrementStep(SecurityStepId.alertsCases);
    }
  }, [onMenuItemClick, createCaseFlyout, caseAttachments, isTourShown, activeStep, incrementStep]);

  const handleAddToExistingCaseClick = useCallback(() => {
    // TODO rename this, this is really `closePopover()`
    onMenuItemClick();
    selectCaseModal.open({ getAttachments: () => caseAttachments });
  }, [caseAttachments, onMenuItemClick, selectCaseModal]);

  const addToCaseActionItems: AlertTableContextMenuItem[] = useMemo(() => {
    if (
      (isActiveTimelines || isInDetections) &&
      userCasesPermissions.create &&
      userCasesPermissions.read &&
      isAlert
    ) {
      return [
        // add to existing case menu item
        {
          'aria-label': ariaLabel,
          'data-test-subj': 'add-to-existing-case-action',
          key: 'add-to-existing-case-action',
          onClick: handleAddToExistingCaseClick,
          size: 's',
          name: ADD_TO_EXISTING_CASE,
        },
        // add to new case menu item
        {
          'aria-label': ariaLabel,
          'data-test-subj': 'add-to-new-case-action',
          key: 'add-to-new-case-action',
          onClick: handleAddToNewCaseClick,
          size: 's',
          name: ADD_TO_NEW_CASE,
        },
      ];
    }
    return [];
  }, [
    ariaLabel,
    handleAddToExistingCaseClick,
    handleAddToNewCaseClick,
    userCasesPermissions.create,
    userCasesPermissions.read,
    isInDetections,
    isActiveTimelines,
    isAlert,
  ]);

  return {
    addToCaseActionItems,
    handleAddToNewCaseClick,
    handleAddToExistingCaseClick,
  };
};
