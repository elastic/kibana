/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiAccordion,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiFlexGroup,
} from '@elastic/eui';
import React, { useCallback, useRef, useState, useMemo } from 'react';
import styled from 'styled-components';

import { useCreateRule } from '../../../../containers/detection_engine/rules';
import { CreateRulesSchema } from '../../../../../../common/detection_engine/schemas/request';
import { useListsConfig } from '../../../../containers/detection_engine/lists/use_lists_config';

import {
  getDetectionEngineUrl,
  getRuleDetailsUrl,
  getRulesUrl,
} from '../../../../../common/components/link_to/redirect_to_detection_engine';
import { SecuritySolutionPageWrapper } from '../../../../../common/components/page_wrapper';
import { displaySuccessToast, useStateToaster } from '../../../../../common/components/toasters';
import { SpyRoute } from '../../../../../common/utils/route/spy_routes';
import { useUserData } from '../../../../components/user_info';
import { AccordionTitle } from '../../../../components/rules/accordion_title';
import { StepDefineRule } from '../../../../components/rules/step_define_rule';
import { StepAboutRule } from '../../../../components/rules/step_about_rule';
import { StepScheduleRule } from '../../../../components/rules/step_schedule_rule';
import { StepRuleActions } from '../../../../components/rules/step_rule_actions';
import * as RuleI18n from '../translations';
import {
  redirectToDetections,
  getActionMessageParams,
  userHasPermissions,
  MaxWidthEuiFlexItem,
} from '../helpers';
import { RuleStep, RuleStepsFormData, RuleStepsFormHooks } from '../types';
import { formatRule, stepIsValid } from './helpers';
import * as i18n from './translations';
import { SecurityPageName } from '../../../../../app/types';
import { ruleStepsOrder } from '../utils';
import { APP_UI_ID } from '../../../../../../common/constants';
import { useKibana } from '../../../../../common/lib/kibana';
import { HeaderPage } from '../../../../../common/components/header_page';

const formHookNoop = async (): Promise<undefined> => undefined;

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
  .euiAccordion__childWrapper {
    transform: none; /* To circumvent an issue in Eui causing the fullscreen datagrid to break */
  }
`;

MyEuiPanel.displayName = 'MyEuiPanel';

const CreateRulePageComponent: React.FC = () => {
  const [
    {
      loading: userInfoLoading,
      isSignalIndexExists,
      isAuthenticated,
      hasEncryptionKey,
      canUserCRUD,
    },
  ] = useUserData();
  const { loading: listsConfigLoading, needsConfiguration: needsListsConfiguration } =
    useListsConfig();
  const { navigateToApp } = useKibana().services.application;
  const loading = userInfoLoading || listsConfigLoading;
  const [, dispatchToaster] = useStateToaster();
  const [activeStep, setActiveStep] = useState<RuleStep>(RuleStep.defineRule);
  const getNextStep = (step: RuleStep): RuleStep | undefined =>
    ruleStepsOrder[ruleStepsOrder.indexOf(step) + 1];
  const defineRuleRef = useRef<EuiAccordion | null>(null);
  const aboutRuleRef = useRef<EuiAccordion | null>(null);
  const scheduleRuleRef = useRef<EuiAccordion | null>(null);
  const ruleActionsRef = useRef<EuiAccordion | null>(null);
  const formHooks = useRef<RuleStepsFormHooks>({
    [RuleStep.defineRule]: formHookNoop,
    [RuleStep.aboutRule]: formHookNoop,
    [RuleStep.scheduleRule]: formHookNoop,
    [RuleStep.ruleActions]: formHookNoop,
  });
  const setFormHook = useCallback(
    <K extends keyof RuleStepsFormHooks>(step: K, hook: RuleStepsFormHooks[K]) => {
      formHooks.current[step] = hook;
    },
    []
  );
  const stepsData = useRef<RuleStepsFormData>({
    [RuleStep.defineRule]: { isValid: false, data: undefined },
    [RuleStep.aboutRule]: { isValid: false, data: undefined },
    [RuleStep.scheduleRule]: { isValid: false, data: undefined },
    [RuleStep.ruleActions]: { isValid: false, data: undefined },
  });
  const setStepData = <K extends keyof RuleStepsFormData>(
    step: K,
    data: RuleStepsFormData[K]
  ): void => {
    stepsData.current[step] = data;
  };
  const [openSteps, setOpenSteps] = useState({
    [RuleStep.defineRule]: false,
    [RuleStep.aboutRule]: false,
    [RuleStep.scheduleRule]: false,
    [RuleStep.ruleActions]: false,
  });
  const [{ isLoading, ruleId }, setRule] = useCreateRule();
  const ruleType = stepsData.current[RuleStep.defineRule].data?.ruleType;
  const ruleName = stepsData.current[RuleStep.aboutRule].data?.name;
  const actionMessageParams = useMemo(() => getActionMessageParams(ruleType), [ruleType]);

  const handleAccordionToggle = useCallback(
    (step: RuleStep, isOpen: boolean) =>
      setOpenSteps((_openSteps) => ({
        ..._openSteps,
        [step]: isOpen,
      })),
    []
  );
  const goToStep = useCallback(
    (step: RuleStep) => {
      if (ruleStepsOrder.indexOf(step) > ruleStepsOrder.indexOf(activeStep) && !openSteps[step]) {
        toggleStepAccordion(step);
      }
      setActiveStep(step);
    },
    [activeStep, openSteps]
  );

  const toggleStepAccordion = (step: RuleStep | null) => {
    if (step === RuleStep.defineRule) {
      defineRuleRef.current?.onToggle();
    } else if (step === RuleStep.aboutRule) {
      aboutRuleRef.current?.onToggle();
    } else if (step === RuleStep.scheduleRule) {
      scheduleRuleRef.current?.onToggle();
    } else if (step === RuleStep.ruleActions) {
      ruleActionsRef.current?.onToggle();
    }
  };

  const editStep = useCallback(
    async (step: RuleStep) => {
      const activeStepData = await formHooks.current[activeStep]();

      if (activeStepData?.isValid) {
        setStepData(activeStep, activeStepData);
        goToStep(step);
      }
    },
    [activeStep, goToStep]
  );
  const submitStep = useCallback(
    async (step: RuleStep) => {
      const stepData = await formHooks.current[step]();

      if (stepData?.isValid) {
        setStepData(step, stepData);
        const nextStep = getNextStep(step);

        if (nextStep != null) {
          goToStep(nextStep);
        } else {
          const defineStep = stepsData.current[RuleStep.defineRule];
          const aboutStep = stepsData.current[RuleStep.aboutRule];
          const scheduleStep = stepsData.current[RuleStep.scheduleRule];
          const actionsStep = stepsData.current[RuleStep.ruleActions];

          if (
            stepIsValid(defineStep) &&
            stepIsValid(aboutStep) &&
            stepIsValid(scheduleStep) &&
            stepIsValid(actionsStep)
          ) {
            setRule(
              formatRule<CreateRulesSchema>(
                defineStep.data,
                aboutStep.data,
                scheduleStep.data,
                actionsStep.data
              )
            );
          }
        }
      }
    },
    [goToStep, setRule]
  );

  const getAccordionType = useCallback(
    (step: RuleStep) => {
      if (step === activeStep) {
        return 'active';
      } else if (stepsData.current[step].isValid) {
        return 'valid';
      }
      return 'passive';
    },
    [activeStep]
  );

  const submitStepDefineRule = useCallback(() => {
    submitStep(RuleStep.defineRule);
  }, [submitStep]);

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

  if (ruleName && ruleId) {
    displaySuccessToast(i18n.SUCCESSFULLY_CREATED_RULES(ruleName), dispatchToaster);
    navigateToApp(APP_UI_ID, {
      deepLinkId: SecurityPageName.rules,
      path: getRuleDetailsUrl(ruleId),
    });
    return null;
  }

  if (
    redirectToDetections(
      isSignalIndexExists,
      isAuthenticated,
      hasEncryptionKey,
      needsListsConfiguration
    )
  ) {
    navigateToApp(APP_UI_ID, {
      deepLinkId: SecurityPageName.alerts,
      path: getDetectionEngineUrl(),
    });
    return null;
  } else if (!userHasPermissions(canUserCRUD)) {
    navigateToApp(APP_UI_ID, {
      deepLinkId: SecurityPageName.rules,
      path: getRulesUrl(),
    });
    return null;
  }
  return (
    <>
      <SecuritySolutionPageWrapper>
        <EuiFlexGroup direction="row" justifyContent="spaceAround">
          <MaxWidthEuiFlexItem>
            <HeaderPage
              backOptions={{
                path: getRulesUrl(),
                text: i18n.BACK_TO_RULES,
                pageId: SecurityPageName.rules,
              }}
              isLoading={isLoading || loading}
              title={i18n.PAGE_TITLE}
            />
            <MyEuiPanel zindex={4} hasBorder>
              <EuiAccordion
                initialIsOpen={true}
                id={RuleStep.defineRule}
                buttonContent={defineRuleButton}
                paddingSize="xs"
                ref={defineRuleRef}
                onToggle={handleAccordionToggle.bind(null, RuleStep.defineRule)}
                extraAction={
                  stepsData.current[RuleStep.defineRule].isValid && (
                    <EuiButtonEmpty
                      data-test-subj="edit-define-rule"
                      iconType="pencil"
                      size="xs"
                      onClick={() => editStep(RuleStep.defineRule)}
                    >
                      {i18n.EDIT_RULE}
                    </EuiButtonEmpty>
                  )
                }
              >
                <EuiHorizontalRule margin="m" />
                <StepDefineRule
                  addPadding={true}
                  defaultValues={stepsData.current[RuleStep.defineRule].data}
                  isReadOnlyView={activeStep !== RuleStep.defineRule}
                  isLoading={isLoading || loading}
                  setForm={setFormHook}
                  onSubmit={submitStepDefineRule}
                  descriptionColumns="singleSplit"
                />
              </EuiAccordion>
            </MyEuiPanel>
            <EuiSpacer size="l" />
            <MyEuiPanel hasBorder zindex={3}>
              <EuiAccordion
                initialIsOpen={false}
                id={RuleStep.aboutRule}
                buttonContent={aboutRuleButton}
                paddingSize="xs"
                ref={aboutRuleRef}
                onToggle={handleAccordionToggle.bind(null, RuleStep.aboutRule)}
                extraAction={
                  stepsData.current[RuleStep.aboutRule].isValid && (
                    <EuiButtonEmpty
                      data-test-subj="edit-about-rule"
                      iconType="pencil"
                      size="xs"
                      onClick={() => editStep(RuleStep.aboutRule)}
                    >
                      {i18n.EDIT_RULE}
                    </EuiButtonEmpty>
                  )
                }
              >
                <EuiHorizontalRule margin="m" />
                <StepAboutRule
                  addPadding={true}
                  defaultValues={stepsData.current[RuleStep.aboutRule].data}
                  defineRuleData={stepsData.current[RuleStep.defineRule].data}
                  descriptionColumns="singleSplit"
                  isReadOnlyView={activeStep !== RuleStep.aboutRule}
                  isLoading={isLoading || loading}
                  setForm={setFormHook}
                  onSubmit={() => submitStep(RuleStep.aboutRule)}
                />
              </EuiAccordion>
            </MyEuiPanel>
            <EuiSpacer size="l" />
            <MyEuiPanel hasBorder zindex={2}>
              <EuiAccordion
                initialIsOpen={false}
                id={RuleStep.scheduleRule}
                buttonContent={scheduleRuleButton}
                paddingSize="xs"
                ref={scheduleRuleRef}
                onToggle={handleAccordionToggle.bind(null, RuleStep.scheduleRule)}
                extraAction={
                  stepsData.current[RuleStep.scheduleRule].isValid && (
                    <EuiButtonEmpty
                      iconType="pencil"
                      size="xs"
                      onClick={() => editStep(RuleStep.scheduleRule)}
                    >
                      {i18n.EDIT_RULE}
                    </EuiButtonEmpty>
                  )
                }
              >
                <EuiHorizontalRule margin="m" />
                <StepScheduleRule
                  ruleType={ruleType}
                  addPadding={true}
                  defaultValues={stepsData.current[RuleStep.scheduleRule].data}
                  descriptionColumns="singleSplit"
                  isReadOnlyView={activeStep !== RuleStep.scheduleRule}
                  isLoading={isLoading || loading}
                  setForm={setFormHook}
                  onSubmit={() => submitStep(RuleStep.scheduleRule)}
                />
              </EuiAccordion>
            </MyEuiPanel>
            <EuiSpacer size="l" />
            <MyEuiPanel hasBorder zindex={1}>
              <EuiAccordion
                initialIsOpen={false}
                id={RuleStep.ruleActions}
                buttonContent={ruleActionsButton}
                paddingSize="xs"
                ref={ruleActionsRef}
                onToggle={handleAccordionToggle.bind(null, RuleStep.ruleActions)}
                extraAction={
                  stepsData.current[RuleStep.ruleActions].isValid && (
                    <EuiButtonEmpty
                      iconType="pencil"
                      size="xs"
                      onClick={() => editStep(RuleStep.ruleActions)}
                    >
                      {i18n.EDIT_RULE}
                    </EuiButtonEmpty>
                  )
                }
              >
                <EuiHorizontalRule margin="m" />
                <StepRuleActions
                  addPadding={true}
                  defaultValues={stepsData.current[RuleStep.ruleActions].data}
                  isReadOnlyView={activeStep !== RuleStep.ruleActions}
                  isLoading={isLoading || loading}
                  setForm={setFormHook}
                  onSubmit={() => submitStep(RuleStep.ruleActions)}
                  actionMessageParams={actionMessageParams}
                />
              </EuiAccordion>
            </MyEuiPanel>
          </MaxWidthEuiFlexItem>
        </EuiFlexGroup>
      </SecuritySolutionPageWrapper>

      <SpyRoute pageName={SecurityPageName.rules} />
    </>
  );
};

export const CreateRulePage = React.memo(CreateRulePageComponent);
