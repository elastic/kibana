/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiFlexItem, EuiSpacer, EuiFormRow } from '@elastic/eui';
import React, { FC, memo, useCallback, useEffect, useState, useMemo } from 'react';
import styled from 'styled-components';

import {
  RuleStepProps,
  RuleStep,
  AboutStepRule,
  DefineStepRule,
} from '../../../pages/detection_engine/rules/types';
import { AddItem } from '../add_item_form';
import { StepRuleDescription } from '../description_step';
import { AddMitreAttackThreat } from '../mitre';
import {
  Field,
  Form,
  getUseField,
  UseField,
  useForm,
  useFormData,
  FieldHook,
} from '../../../../shared_imports';

import { defaultRiskScoreBySeverity, severityOptions } from './data';
import { stepAboutDefaultValue } from './default_value';
import { isUrlInvalid } from '../../../../common/utils/validators';
import { schema as defaultSchema, threatIndicatorPathRequiredSchemaValue } from './schema';
import * as I18n from './translations';
import { StepContentWrapper } from '../step_content_wrapper';
import { NextStep } from '../next_step';
import { MarkdownEditorForm } from '../../../../common/components/markdown_editor/eui_form';
import { SeverityField } from '../severity_mapping';
import { RiskScoreField } from '../risk_score_mapping';
import { AutocompleteField } from '../autocomplete_field';
import { useFetchIndex } from '../../../../common/containers/source';
import { isThreatMatchRule } from '../../../../../common/detection_engine/utils';
import { DEFAULT_INDICATOR_SOURCE_PATH } from '../../../../../common/constants';

const CommonUseField = getUseField({ component: Field });

interface StepAboutRuleProps extends RuleStepProps {
  defaultValues?: AboutStepRule;
  defineRuleData?: DefineStepRule;
}

const ThreeQuartersContainer = styled.div`
  max-width: 740px;
`;

ThreeQuartersContainer.displayName = 'ThreeQuartersContainer';

const TagContainer = styled.div`
  margin-top: 16px;
`;

TagContainer.displayName = 'TagContainer';

const StepAboutRuleComponent: FC<StepAboutRuleProps> = ({
  addPadding = false,
  defaultValues,
  defineRuleData,
  descriptionColumns = 'singleSplit',
  isReadOnlyView,
  isUpdateView = false,
  isLoading,
  onSubmit,
  setForm,
}) => {
  const isThreatMatchRuleValue = useMemo(
    () => isThreatMatchRule(defineRuleData?.ruleType),
    [defineRuleData?.ruleType]
  );

  const initialState: AboutStepRule = useMemo(
    () =>
      defaultValues ??
      (isThreatMatchRuleValue
        ? { ...stepAboutDefaultValue, threatIndicatorPath: DEFAULT_INDICATOR_SOURCE_PATH }
        : stepAboutDefaultValue),
    [defaultValues, isThreatMatchRuleValue]
  );

  const schema = useMemo(
    () =>
      isThreatMatchRuleValue
        ? { ...defaultSchema, threatIndicatorPath: threatIndicatorPathRequiredSchemaValue }
        : defaultSchema,
    [isThreatMatchRuleValue]
  );

  const [severityValue, setSeverityValue] = useState<string>(initialState.severity.value);
  const [indexPatternLoading, { indexPatterns }] = useFetchIndex(defineRuleData?.index ?? []);

  const { form } = useForm<AboutStepRule>({
    defaultValue: initialState,
    options: { stripEmptyFields: false },
    schema,
  });
  const { getFields, getFormData, submit } = form;
  const [{ severity: formSeverity }] = useFormData<AboutStepRule>({
    form,
    watch: ['severity'],
  });

  useEffect(() => {
    const formSeverityValue = formSeverity?.value;
    if (formSeverityValue != null && formSeverityValue !== severityValue) {
      setSeverityValue(formSeverityValue);

      const newRiskScoreValue = defaultRiskScoreBySeverity[formSeverityValue];
      if (newRiskScoreValue != null) {
        const riskScoreField = getFields().riskScore as FieldHook<AboutStepRule['riskScore']>;
        riskScoreField.setValue({ ...riskScoreField.value, value: newRiskScoreValue });
      }
    }
  }, [formSeverity?.value, getFields, severityValue]);

  const getData = useCallback(async () => {
    const result = await submit();
    return result?.isValid
      ? result
      : {
          isValid: false,
          data: getFormData(),
        };
  }, [getFormData, submit]);

  const handleSubmit = useCallback(() => {
    if (onSubmit) {
      onSubmit();
    }
  }, [onSubmit]);

  useEffect(() => {
    let didCancel = false;
    if (setForm && !didCancel) {
      setForm(RuleStep.aboutRule, getData);
    }
    return () => {
      didCancel = true;
    };
  }, [getData, setForm]);

  return isReadOnlyView ? (
    <StepContentWrapper data-test-subj="aboutStep" addPadding={addPadding}>
      <StepRuleDescription columns={descriptionColumns} schema={schema} data={initialState} />
    </StepContentWrapper>
  ) : (
    <>
      <StepContentWrapper addPadding={!isUpdateView}>
        <Form form={form}>
          <CommonUseField
            path="name"
            componentProps={{
              idAria: 'detectionEngineStepAboutRuleName',
              'data-test-subj': 'detectionEngineStepAboutRuleName',
              euiFieldProps: {
                fullWidth: true,
                disabled: isLoading,
              },
            }}
          />
          <EuiSpacer size="l" />
          <CommonUseField
            path="description"
            componentProps={{
              idAria: 'detectionEngineStepAboutRuleDescription',
              'data-test-subj': 'detectionEngineStepAboutRuleDescription',
              euiFieldProps: {
                disabled: isLoading,
                compressed: true,
                fullWidth: true,
              },
            }}
          />
          <EuiSpacer size="l" />
          <EuiFlexItem>
            <UseField
              path="severity"
              component={SeverityField}
              componentProps={{
                dataTestSubj: 'detectionEngineStepAboutRuleSeverityField',
                idAria: 'detectionEngineStepAboutRuleSeverityField',
                isDisabled: isLoading || indexPatternLoading,
                options: severityOptions,
                indices: indexPatterns,
              }}
            />
          </EuiFlexItem>
          <EuiSpacer size="l" />
          <EuiFlexItem>
            <CommonUseField
              path="riskScore"
              component={RiskScoreField}
              componentProps={{
                dataTestSubj: 'detectionEngineStepAboutRuleRiskScore',
                idAria: 'detectionEngineStepAboutRuleRiskScore',
                isDisabled: isLoading || indexPatternLoading,
                indices: indexPatterns,
              }}
            />
          </EuiFlexItem>
          <TagContainer>
            <CommonUseField
              path="tags"
              componentProps={{
                idAria: 'detectionEngineStepAboutRuleTags',
                'data-test-subj': 'detectionEngineStepAboutRuleTags',
                euiFieldProps: {
                  fullWidth: true,
                  isDisabled: isLoading || indexPatternLoading,
                  placeholder: '',
                },
              }}
            />
          </TagContainer>
          <EuiSpacer size="l" />
          <EuiAccordion
            data-test-subj="advancedSettings"
            id="advancedSettingsAccordion"
            buttonContent={I18n.ADVANCED_SETTINGS}
          >
            <EuiSpacer size="l" />
            <UseField
              path="references"
              component={AddItem}
              componentProps={{
                addText: I18n.ADD_REFERENCE,
                idAria: 'detectionEngineStepAboutRuleReferenceUrls',
                isDisabled: isLoading,
                dataTestSubj: 'detectionEngineStepAboutRuleReferenceUrls',
                validate: isUrlInvalid,
              }}
            />
            <UseField
              path="falsePositives"
              component={AddItem}
              componentProps={{
                addText: I18n.ADD_FALSE_POSITIVE,
                idAria: 'detectionEngineStepAboutRuleFalsePositives',
                isDisabled: isLoading,
                dataTestSubj: 'detectionEngineStepAboutRuleFalsePositives',
              }}
            />
            <UseField
              path="threat"
              component={AddMitreAttackThreat}
              componentProps={{
                idAria: 'detectionEngineStepAboutRuleMitreThreat',
                isDisabled: isLoading,
                dataTestSubj: 'detectionEngineStepAboutRuleMitreThreat',
              }}
            />
            <EuiSpacer size="l" />
            <UseField
              path="note"
              component={MarkdownEditorForm}
              componentProps={{
                idAria: 'detectionEngineStepAboutRuleNote',
                isDisabled: isLoading,
                dataTestSubj: 'detectionEngineStepAboutRuleNote',
                placeholder: I18n.ADD_RULE_NOTE_HELP_TEXT,
              }}
            />
            <EuiSpacer size="l" />
            <CommonUseField
              path="author"
              componentProps={{
                idAria: 'detectionEngineStepAboutRuleAuthor',
                'data-test-subj': 'detectionEngineStepAboutRuleAuthor',
                euiFieldProps: {
                  fullWidth: true,
                  isDisabled: isLoading,
                  placeholder: '',
                },
              }}
            />
            <EuiSpacer size="l" />
            <CommonUseField
              path="license"
              componentProps={{
                idAria: 'detectionEngineStepAboutRuleLicense',
                'data-test-subj': 'detectionEngineStepAboutRuleLicense',
                euiFieldProps: {
                  fullWidth: true,
                  disabled: isLoading,
                  placeholder: '',
                },
              }}
            />
            <EuiSpacer size="l" />
            <EuiFormRow label={I18n.GLOBAL_ENDPOINT_EXCEPTION_LIST} fullWidth>
              <CommonUseField
                path="isAssociatedToEndpointList"
                componentProps={{
                  idAria: 'detectionEngineStepAboutRuleAssociatedToEndpointList',
                  'data-test-subj': 'detectionEngineStepAboutRuleAssociatedToEndpointList',
                  euiFieldProps: {
                    disabled: isLoading,
                  },
                }}
              />
            </EuiFormRow>
            <EuiFormRow label={I18n.BUILDING_BLOCK} fullWidth>
              <CommonUseField
                path="isBuildingBlock"
                componentProps={{
                  idAria: 'detectionEngineStepAboutRuleBuildingBlock',
                  'data-test-subj': 'detectionEngineStepAboutRuleBuildingBlock',
                  euiFieldProps: {
                    disabled: isLoading,
                  },
                }}
              />
            </EuiFormRow>
            <EuiSpacer size="l" />
            {isThreatMatchRuleValue && (
              <>
                <CommonUseField
                  path="threatIndicatorPath"
                  componentProps={{
                    idAria: 'detectionEngineStepAboutThreatIndicatorPath',
                    'data-test-subj': 'detectionEngineStepAboutThreatIndicatorPath',
                    euiFieldProps: {
                      fullWidth: true,
                      disabled: isLoading,
                      placeholder: DEFAULT_INDICATOR_SOURCE_PATH,
                    },
                  }}
                />
              </>
            )}
            <EuiSpacer size="l" />
            <UseField
              path="ruleNameOverride"
              component={AutocompleteField}
              componentProps={{
                dataTestSubj: 'detectionEngineStepAboutRuleRuleNameOverride',
                fieldType: 'string',
                idAria: 'detectionEngineStepAboutRuleRuleNameOverride',
                indices: indexPatterns,
                isDisabled: isLoading || indexPatternLoading,
                placeholder: '',
              }}
            />
            <EuiSpacer size="l" />
            <UseField
              path="timestampOverride"
              component={AutocompleteField}
              componentProps={{
                dataTestSubj: 'detectionEngineStepAboutRuleTimestampOverride',
                fieldType: 'date',
                idAria: 'detectionEngineStepAboutRuleTimestampOverride',
                indices: indexPatterns,
                isDisabled: isLoading || indexPatternLoading,
                placeholder: '',
              }}
            />
          </EuiAccordion>
        </Form>
      </StepContentWrapper>

      {!isUpdateView && (
        <NextStep dataTestSubj="about-continue" onClick={handleSubmit} isDisabled={isLoading} />
      )}
    </>
  );
};

export const StepAboutRule = memo(StepAboutRuleComponent);
