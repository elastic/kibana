/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiAccordion, EuiFlexItem, EuiSpacer, EuiFormRow } from '@elastic/eui';
import React, { FC, memo, useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import deepEqual from 'fast-deep-equal';

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
  FormDataProvider,
  getUseField,
  UseField,
  useForm,
} from '../../../../shared_imports';

import { defaultRiskScoreBySeverity, severityOptions, SeverityValue } from './data';
import { stepAboutDefaultValue } from './default_value';
import { isUrlInvalid } from '../../../../common/utils/validators';
import { schema } from './schema';
import * as I18n from './translations';
import { StepContentWrapper } from '../step_content_wrapper';
import { NextStep } from '../next_step';
import { MarkdownEditorForm } from '../../../../common/components/markdown_editor/form';
import { setFieldValue } from '../../../pages/detection_engine/rules/helpers';
import { SeverityField } from '../severity_mapping';
import { RiskScoreField } from '../risk_score_mapping';
import { useFetchIndexPatterns } from '../../../containers/detection_engine/rules';
import { AutocompleteField } from '../autocomplete_field';

const CommonUseField = getUseField({ component: Field });

interface StepAboutRuleProps extends RuleStepProps {
  defaultValues?: AboutStepRule | null;
  defineRuleData?: DefineStepRule | null;
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
  setForm,
  setStepData,
}) => {
  const [myStepData, setMyStepData] = useState<AboutStepRule>(stepAboutDefaultValue);
  const [{ isLoading: indexPatternLoading, indexPatterns }] = useFetchIndexPatterns(
    defineRuleData?.index ?? [],
    'step_about_rule'
  );
  const canUseExceptions =
    defineRuleData?.ruleType &&
    !isMlRule(defineRuleData.ruleType) &&
    !isThresholdRule(defineRuleData.ruleType);

  const { form } = useForm({
    defaultValue: myStepData,
    options: { stripEmptyFields: false },
    schema,
  });

  const onSubmit = useCallback(async () => {
    if (setStepData) {
      setStepData(RuleStep.aboutRule, null, false);
      const { isValid, data } = await form.submit();
      if (isValid) {
        setStepData(RuleStep.aboutRule, data, isValid);
        setMyStepData({ ...data, isNew: false } as AboutStepRule);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  useEffect(() => {
    const { isNew, ...initDefaultValue } = myStepData;
    if (defaultValues != null && !deepEqual(initDefaultValue, defaultValues)) {
      const myDefaultValues = {
        ...defaultValues,
        isNew: false,
      };
      setMyStepData(myDefaultValues);
      setFieldValue(form, schema, myDefaultValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValues]);

  useEffect(() => {
    if (setForm != null) {
      setForm(RuleStep.aboutRule, form);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  return isReadOnlyView && myStepData.name != null ? (
    <StepContentWrapper data-test-subj="aboutStep" addPadding={addPadding}>
      <StepRuleDescription columns={descriptionColumns} schema={schema} data={myStepData} />
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
                  isDisabled: isLoading,
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
          <FormDataProvider pathsToWatch="severity">
            {({ severity }) => {
              const newRiskScore = defaultRiskScoreBySeverity[severity as SeverityValue];
              const severityField = form.getFields().severity;
              const riskScoreField = form.getFields().riskScore;
              if (
                severityField.value !== severity &&
                newRiskScore != null &&
                riskScoreField.value !== newRiskScore
              ) {
                riskScoreField.setValue(newRiskScore);
              }
              return null;
            }}
          </FormDataProvider>
        </Form>
      </StepContentWrapper>

      {!isUpdateView && (
        <NextStep dataTestSubj="about-continue" onClick={onSubmit} isDisabled={isLoading} />
      )}
    </>
  );
};

export const StepAboutRule = memo(StepAboutRuleComponent);
