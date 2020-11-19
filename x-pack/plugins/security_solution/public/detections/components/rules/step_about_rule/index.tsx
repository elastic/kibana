/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiAccordion, EuiFlexItem, EuiSpacer, EuiFormRow } from '@elastic/eui';
import React, { FC, memo, useCallback, useEffect, useState, useMemo } from 'react';
import styled from 'styled-components';

import { useFilteredBrowserFields } from '../../../../common/containers/source/use_filtered_fetch_index';
import { isMlRule } from '../../../../../common/machine_learning/helpers';
import { isThresholdRule } from '../../../../../common/detection_engine/utils';
import {
  RuleStepProps,
  RuleStep,
  AboutStepRule,
  DefineStepRule,
} from '../../../pages/detection_engine/rules/types';
import { AddItem } from '../add_item_form';
import { StepRuleDescription } from '../description_step';
import { AddMitreThreat } from '../mitre';
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
import { getSchema } from './schema';
import * as I18n from './translations';
import { StepContentWrapper } from '../step_content_wrapper';
import { NextStep } from '../next_step';
import { MarkdownEditorForm } from '../../../../common/components/markdown_editor/eui_form';
import { SeverityField } from '../severity_mapping';
import { RiskScoreField } from '../risk_score_mapping';
import { AutocompleteField } from '../autocomplete_field';
import { useFetchIndex } from '../../../../common/containers/source';

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
  const initialState = defaultValues ?? stepAboutDefaultValue;
  const indexes = useMemo((): string[] => defineRuleData?.index ?? [], [defineRuleData?.index]);
  const [severityValue, setSeverityValue] = useState<string>(initialState.severity.value);
  const [indexPatternLoading, { indexPatterns, browserFields }] = useFetchIndex(indexes);
  const [filteredTimestampOverrideFields] = useFilteredBrowserFields({
    browserFields,
    filterByIndexes: indexes,
    filterByEsTypes: ['date'],
  });
  const [filteredNameOverrideFields] = useFilteredBrowserFields({
    browserFields,
    filterByEsTypes: ['keyword', 'text'],
  });
  const schema = useMemo(
    () =>
      getSchema({
        timestampOverrideFields: filteredTimestampOverrideFields,
      }),
    [filteredTimestampOverrideFields]
  );

  const canUseExceptions =
    defineRuleData?.ruleType &&
    !isMlRule(defineRuleData.ruleType) &&
    !isThresholdRule(defineRuleData.ruleType);

  const { form } = useForm<AboutStepRule>({
    defaultValue: initialState,
    options: { stripEmptyFields: false },
    schema,
  });
  const { getFields, getFormData, submit, getErrors } = form;
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
      ? { ...result, errors: [] }
      : {
          isValid: false,
          data: getFormData(),
          errors: getErrors(),
        };
  }, [getFormData, getErrors, submit]);

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
              component={AddMitreThreat}
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
                    disabled: isLoading || !canUseExceptions,
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
            <UseField
              path="ruleNameOverride"
              component={AutocompleteField}
              componentProps={{
                dataTestSubj: 'detectionEngineStepAboutRuleRuleNameOverride',
                idAria: 'detectionEngineStepAboutRuleRuleNameOverride',
                browserFields: filteredNameOverrideFields,
                isDisabled: isLoading || indexPatternLoading,
                showOptional: true,
                placeholder: '',
              }}
            />
            <EuiSpacer size="l" />
            <UseField
              path="timestampOverride"
              component={AutocompleteField}
              componentProps={{
                dataTestSubj: 'detectionEngineStepAboutRuleTimestampOverride',
                idAria: 'detectionEngineStepAboutRuleTimestampOverride',
                browserFields: filteredTimestampOverrideFields,
                isDisabled: isLoading || indexPatternLoading,
                showOptional: true,
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
