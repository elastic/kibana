/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiAccordion, EuiHorizontalRule, EuiPanel, EuiSpacer } from '@elastic/eui';
import React, { useCallback, useRef, useState, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import styled, { StyledComponent } from 'styled-components';

import { usePersistRule } from '../../../../containers/detection_engine/rules';

import {
  getRulesUrl,
  getDetectionEngineUrl,
} from '../../../../../common/components/link_to/redirect_to_detection_engine';
import { WrapperPage } from '../../../../../common/components/wrapper_page';
import { displaySuccessToast, useStateToaster } from '../../../../../common/components/toasters';
import { SpyRoute } from '../../../../../common/utils/route/spy_routes';
import { useUserInfo } from '../../../../components/user_info';
import { AccordionTitle } from '../../../../components/rules/accordion_title';
import { FormData, FormHook } from '../../../../../shared_imports';
import { StepAboutRule } from '../../../../components/rules/step_about_rule';
import { StepDefineRule } from '../../../../components/rules/step_define_rule';
import { StepScheduleRule } from '../../../../components/rules/step_schedule_rule';
import { StepRuleActions } from '../../../../components/rules/step_rule_actions';
import { DetectionEngineHeaderPage } from '../../../../components/detection_engine_header_page';
import * as RuleI18n from '../translations';
import { redirectToDetections, getActionMessageParams, userHasNoPermissions } from '../helpers';
import {
  AboutStepRule,
  DefineStepRule,
  RuleStep,
  RuleStepData,
  ScheduleStepRule,
  ActionsStepRule,
} from '../types';
import { formatRule } from './helpers';
import * as i18n from './translations';
import { SecurityPageName } from '../../../../../app/types';

const stepsRuleOrder = [
  RuleStep.defineRule,
  RuleStep.aboutRule,
  RuleStep.scheduleRule,
  RuleStep.ruleActions,
];

const MyEuiPanel = styled(EuiPanel)<{
  zindex?: number;
}>`
  position: relative;
  z-index: ${(props) => props.zindex}; /* ugly fix to allow searchBar to overflow the EuiPanel */

  > .euiAccordion > .euiAccordion__triggerWrapper {
    .euiAccordion__button {
      cursor: default !important;
      &:hover {
        text-decoration: none !important;
      }
    }

    .euiAccordion__iconWrapper {
      display: none;
    }
  }
`;

MyEuiPanel.displayName = 'MyEuiPanel';

const StepDefineRuleAccordion: StyledComponent<
  typeof EuiAccordion,
  any, // eslint-disable-line
  { ref: React.MutableRefObject<EuiAccordion | null> },
  never
> = styled(EuiAccordion)`
  .euiAccordion__childWrapper {
    overflow: visible;
  }
`;

StepDefineRuleAccordion.displayName = 'StepDefineRuleAccordion';

const CreateRulePageComponent: React.FC = () => {
  const {
    loading,
    isSignalIndexExists,
    isAuthenticated,
    hasEncryptionKey,
    canUserCRUD,
  } = useUserInfo();
  const [, dispatchToaster] = useStateToaster();
  const [openAccordionId, setOpenAccordionId] = useState<RuleStep>(RuleStep.defineRule);
  const defineRuleRef = useRef<EuiAccordion | null>(null);
  const aboutRuleRef = useRef<EuiAccordion | null>(null);
  const scheduleRuleRef = useRef<EuiAccordion | null>(null);
  const ruleActionsRef = useRef<EuiAccordion | null>(null);
  const stepsForm = useRef<Record<RuleStep, FormHook<FormData> | null>>({
    [RuleStep.defineRule]: null,
    [RuleStep.aboutRule]: null,
    [RuleStep.scheduleRule]: null,
    [RuleStep.ruleActions]: null,
  });
  const stepsData = useRef<Record<RuleStep, RuleStepData>>({
    [RuleStep.defineRule]: { isValid: false, data: {} },
    [RuleStep.aboutRule]: { isValid: false, data: {} },
    [RuleStep.scheduleRule]: { isValid: false, data: {} },
    [RuleStep.ruleActions]: { isValid: false, data: {} },
  });
  const [isStepRuleInReadOnlyView, setIsStepRuleInEditView] = useState<Record<RuleStep, boolean>>({
    [RuleStep.defineRule]: false,
    [RuleStep.aboutRule]: false,
    [RuleStep.scheduleRule]: false,
    [RuleStep.ruleActions]: false,
  });
  const [{ isLoading, isSaved }, setRule] = usePersistRule();
  const actionMessageParams = useMemo(
    () =>
      getActionMessageParams((stepsData.current['define-rule'].data as DefineStepRule).ruleType),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stepsData.current['define-rule'].data]
  );
  const history = useHistory();

  const setStepData = useCallback(
    (step: RuleStep, data: unknown, isValid: boolean) => {
      stepsData.current[step] = { ...stepsData.current[step], data, isValid };
      if (isValid) {
        const stepRuleIdx = stepsRuleOrder.findIndex((item) => step === item);
        if ([0, 1, 2].includes(stepRuleIdx)) {
          if (isStepRuleInReadOnlyView[stepsRuleOrder[stepRuleIdx + 1]]) {
            setOpenAccordionId(stepsRuleOrder[stepRuleIdx + 1]);
            setIsStepRuleInEditView({
              ...isStepRuleInReadOnlyView,
              [step]: true,
              [stepsRuleOrder[stepRuleIdx + 1]]: false,
            });
          } else if (openAccordionId !== stepsRuleOrder[stepRuleIdx + 1]) {
            setIsStepRuleInEditView({
              ...isStepRuleInReadOnlyView,
              [step]: true,
            });
            openCloseAccordion(stepsRuleOrder[stepRuleIdx + 1]);
            setOpenAccordionId(stepsRuleOrder[stepRuleIdx + 1]);
          }
        } else if (
          stepRuleIdx === 3 &&
          stepsData.current[RuleStep.defineRule].isValid &&
          stepsData.current[RuleStep.aboutRule].isValid &&
          stepsData.current[RuleStep.scheduleRule].isValid
        ) {
          setRule(
            formatRule(
              stepsData.current[RuleStep.defineRule].data as DefineStepRule,
              stepsData.current[RuleStep.aboutRule].data as AboutStepRule,
              stepsData.current[RuleStep.scheduleRule].data as ScheduleStepRule,
              stepsData.current[RuleStep.ruleActions].data as ActionsStepRule
            )
          );
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isStepRuleInReadOnlyView, openAccordionId, stepsData.current, setRule]
  );

  const setStepsForm = useCallback((step: RuleStep, form: FormHook<FormData>) => {
    stepsForm.current[step] = form;
  }, []);

  const getAccordionType = useCallback(
    (accordionId: RuleStep) => {
      if (accordionId === openAccordionId) {
        return 'active';
      } else if (stepsData.current[accordionId].isValid) {
        return 'valid';
      }
      return 'passive';
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [openAccordionId, stepsData.current]
  );

  const defineRuleButton = (
    <AccordionTitle
      name="1"
      title={RuleI18n.DEFINE_RULE}
      type={getAccordionType(RuleStep.defineRule)}
    />
  );

  const aboutRuleButton = (
    <AccordionTitle
      name="2"
      title={RuleI18n.ABOUT_RULE}
      type={getAccordionType(RuleStep.aboutRule)}
    />
  );

  const scheduleRuleButton = (
    <AccordionTitle
      name="3"
      title={RuleI18n.SCHEDULE_RULE}
      type={getAccordionType(RuleStep.scheduleRule)}
    />
  );

  const ruleActionsButton = (
    <AccordionTitle
      name="4"
      title={RuleI18n.RULE_ACTIONS}
      type={getAccordionType(RuleStep.ruleActions)}
    />
  );

  const openCloseAccordion = (accordionId: RuleStep | null) => {
    if (accordionId != null) {
      if (accordionId === RuleStep.defineRule && defineRuleRef.current != null) {
        defineRuleRef.current.onToggle();
      } else if (accordionId === RuleStep.aboutRule && aboutRuleRef.current != null) {
        aboutRuleRef.current.onToggle();
      } else if (accordionId === RuleStep.scheduleRule && scheduleRuleRef.current != null) {
        scheduleRuleRef.current.onToggle();
      } else if (accordionId === RuleStep.ruleActions && ruleActionsRef.current != null) {
        ruleActionsRef.current.onToggle();
      }
    }
  };

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const manageAccordions = useCallback(
    (id: RuleStep, isOpen: boolean) => {
      const activeRuleIdx = stepsRuleOrder.findIndex((step) => step === openAccordionId);
      const stepRuleIdx = stepsRuleOrder.findIndex((step) => step === id);

      if ((id === openAccordionId || stepRuleIdx < activeRuleIdx) && !isOpen) {
        openCloseAccordion(id);
      } else if (stepRuleIdx >= activeRuleIdx) {
        if (
          openAccordionId !== id &&
          !stepsData.current[openAccordionId].isValid &&
          !isStepRuleInReadOnlyView[id] &&
          isOpen
        ) {
          openCloseAccordion(id);
        }
      }
    },
    [isStepRuleInReadOnlyView, openAccordionId, stepsData]
  );

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const manageIsEditable = useCallback(
    async (id: RuleStep) => {
      const activeForm = await stepsForm.current[openAccordionId]?.submit();
      if (activeForm != null && activeForm?.isValid) {
        stepsData.current[openAccordionId] = {
          ...stepsData.current[openAccordionId],
          data: activeForm.data,
          isValid: activeForm.isValid,
        };
        setOpenAccordionId(id);
        setIsStepRuleInEditView({
          ...isStepRuleInReadOnlyView,
          [openAccordionId]: true,
          [id]: false,
        });
      }
    },
    [isStepRuleInReadOnlyView, openAccordionId]
  );

  if (isSaved) {
    const ruleName = (stepsData.current[RuleStep.aboutRule].data as AboutStepRule).name;
    displaySuccessToast(i18n.SUCCESSFULLY_CREATED_RULES(ruleName), dispatchToaster);
    history.replace(getRulesUrl());
    return null;
  }

  if (redirectToDetections(isSignalIndexExists, isAuthenticated, hasEncryptionKey)) {
    history.replace(getDetectionEngineUrl());
    return null;
  } else if (userHasNoPermissions(canUserCRUD)) {
    history.replace(getRulesUrl());
    return null;
  }

  return (
    <>
      <WrapperPage restrictWidth>
        <DetectionEngineHeaderPage
          backOptions={{
            href: getRulesUrl(),
            text: i18n.BACK_TO_RULES,
            pageId: SecurityPageName.detections,
          }}
          border
          isLoading={isLoading || loading}
          title={i18n.PAGE_TITLE}
        />
        <MyEuiPanel zindex={4}>
          <StepDefineRuleAccordion
            initialIsOpen={true}
            id={RuleStep.defineRule}
            buttonContent={defineRuleButton}
            paddingSize="xs"
            ref={defineRuleRef}
            onToggle={manageAccordions.bind(null, RuleStep.defineRule)}
            extraAction={
              stepsData.current[RuleStep.defineRule].isValid && (
                <EuiButtonEmpty
                  iconType="pencil"
                  size="xs"
                  onClick={manageIsEditable.bind(null, RuleStep.defineRule)}
                >
                  {i18n.EDIT_RULE}
                </EuiButtonEmpty>
              )
            }
          >
            <EuiHorizontalRule margin="m" />
            <StepDefineRule
              addPadding={true}
              defaultValues={
                (stepsData.current[RuleStep.defineRule].data as DefineStepRule) ?? null
              }
              isReadOnlyView={isStepRuleInReadOnlyView[RuleStep.defineRule]}
              isLoading={isLoading || loading}
              setForm={setStepsForm}
              setStepData={setStepData}
              descriptionColumns="singleSplit"
            />
          </StepDefineRuleAccordion>
        </MyEuiPanel>
        <EuiSpacer size="l" />
        <MyEuiPanel zindex={3}>
          <EuiAccordion
            initialIsOpen={false}
            id={RuleStep.aboutRule}
            buttonContent={aboutRuleButton}
            paddingSize="xs"
            ref={aboutRuleRef}
            onToggle={manageAccordions.bind(null, RuleStep.aboutRule)}
            extraAction={
              stepsData.current[RuleStep.aboutRule].isValid && (
                <EuiButtonEmpty
                  iconType="pencil"
                  size="xs"
                  onClick={manageIsEditable.bind(null, RuleStep.aboutRule)}
                >
                  {i18n.EDIT_RULE}
                </EuiButtonEmpty>
              )
            }
          >
            <EuiHorizontalRule margin="m" />
            <StepAboutRule
              addPadding={true}
              defaultValues={(stepsData.current[RuleStep.aboutRule].data as AboutStepRule) ?? null}
              defineRuleData={
                (stepsData.current[RuleStep.defineRule].data as DefineStepRule) ?? null
              }
              descriptionColumns="singleSplit"
              isReadOnlyView={isStepRuleInReadOnlyView[RuleStep.aboutRule]}
              isLoading={isLoading || loading}
              setForm={setStepsForm}
              setStepData={setStepData}
            />
          </EuiAccordion>
        </MyEuiPanel>
        <EuiSpacer size="l" />
        <MyEuiPanel zindex={2}>
          <EuiAccordion
            initialIsOpen={false}
            id={RuleStep.scheduleRule}
            buttonContent={scheduleRuleButton}
            paddingSize="xs"
            ref={scheduleRuleRef}
            onToggle={manageAccordions.bind(null, RuleStep.scheduleRule)}
            extraAction={
              stepsData.current[RuleStep.scheduleRule].isValid && (
                <EuiButtonEmpty
                  iconType="pencil"
                  size="xs"
                  onClick={manageIsEditable.bind(null, RuleStep.scheduleRule)}
                >
                  {i18n.EDIT_RULE}
                </EuiButtonEmpty>
              )
            }
          >
            <EuiHorizontalRule margin="m" />
            <StepScheduleRule
              addPadding={true}
              defaultValues={
                (stepsData.current[RuleStep.scheduleRule].data as ScheduleStepRule) ?? null
              }
              descriptionColumns="singleSplit"
              isReadOnlyView={isStepRuleInReadOnlyView[RuleStep.scheduleRule]}
              isLoading={isLoading || loading}
              setForm={setStepsForm}
              setStepData={setStepData}
            />
          </EuiAccordion>
        </MyEuiPanel>
        <EuiSpacer size="l" />
        <MyEuiPanel zindex={1}>
          <EuiAccordion
            initialIsOpen={false}
            id={RuleStep.ruleActions}
            buttonContent={ruleActionsButton}
            paddingSize="xs"
            ref={ruleActionsRef}
            onToggle={manageAccordions.bind(null, RuleStep.ruleActions)}
            extraAction={
              stepsData.current[RuleStep.ruleActions].isValid && (
                <EuiButtonEmpty
                  iconType="pencil"
                  size="xs"
                  onClick={manageIsEditable.bind(null, RuleStep.ruleActions)}
                >
                  {i18n.EDIT_RULE}
                </EuiButtonEmpty>
              )
            }
          >
            <EuiHorizontalRule margin="m" />
            <StepRuleActions
              addPadding={true}
              isReadOnlyView={isStepRuleInReadOnlyView[RuleStep.ruleActions]}
              isLoading={isLoading || loading}
              setForm={setStepsForm}
              setStepData={setStepData}
              actionMessageParams={actionMessageParams}
            />
          </EuiAccordion>
        </MyEuiPanel>
      </WrapperPage>

      <SpyRoute pageName={SecurityPageName.detections} />
    </>
  );
};

export const CreateRulePage = React.memo(CreateRulePageComponent);
