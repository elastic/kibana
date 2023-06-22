/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiFlexItem, EuiSpacer, EuiFormRow } from '@elastic/eui';
import type { FC } from 'react';
import React, { memo, useEffect, useState, useMemo } from 'react';
import styled from 'styled-components';

import type { DataViewBase } from '@kbn/es-query';
import { isThreatMatchRule } from '../../../../../common/detection_engine/utils';
import type {
  RuleStepProps,
  AboutStepRule,
  DefineStepRule,
} from '../../../pages/detection_engine/rules/types';
import { AddItem } from '../add_item_form';
import { StepRuleDescription } from '../description_step';
import { AddMitreAttackThreat } from '../mitre';
import type { FieldHook, FormHook } from '../../../../shared_imports';
import { Field, Form, getUseField, UseField, useFormData } from '../../../../shared_imports';

import { defaultRiskScoreBySeverity, severityOptions } from './data';
import { isUrlInvalid } from '../../../../common/utils/validators';
import { schema as defaultSchema } from './schema';
import * as I18n from './translations';
import { StepContentWrapper } from '../step_content_wrapper';
import { MarkdownEditorForm } from '../../../../common/components/markdown_editor/eui_form';
import { SeverityField } from '../severity_mapping';
import { RiskScoreField } from '../risk_score_mapping';
import { AutocompleteField } from '../autocomplete_field';
import { useFetchIndex } from '../../../../common/containers/source';
import { DEFAULT_INDICATOR_SOURCE_PATH } from '../../../../../common/constants';
import { useKibana } from '../../../../common/lib/kibana';
import { useRuleIndices } from '../../../../detection_engine/rule_management/logic/use_rule_indices';

const CommonUseField = getUseField({ component: Field });

interface StepAboutRuleProps extends RuleStepProps {
  defaultValues: AboutStepRule;
  defineRuleData?: DefineStepRule;
  form: FormHook<AboutStepRule>;
}

interface StepAboutRuleReadOnlyProps {
  addPadding: boolean;
  descriptionColumns: 'multi' | 'single' | 'singleSplit';
  defaultValues: AboutStepRule;
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
  defaultValues: initialState,
  defineRuleData,
  isUpdateView = false,
  isLoading,
  form,
}) => {
  const { data } = useKibana().services;

  const isThreatMatchRuleValue = useMemo(
    () => isThreatMatchRule(defineRuleData?.ruleType),
    [defineRuleData]
  );

  const [severityValue, setSeverityValue] = useState<string>(initialState.severity.value);

  const { ruleIndices } = useRuleIndices(
    defineRuleData?.machineLearningJobId,
    defineRuleData?.index
  );

  /**
   * 1. if not null, fetch data view from id saved on rule form
   * 2. Create a state to set the indexPattern to be used
   * 3. useEffect if indexIndexPattern is updated and dataView from rule form is empty
   */

  const [indexPatternLoading, { indexPatterns: indexIndexPattern }] = useFetchIndex(ruleIndices);

  const [indexPattern, setIndexPattern] = useState<DataViewBase>(indexIndexPattern);

  useEffect(() => {
    if (
      defineRuleData?.index != null &&
      (defineRuleData?.dataViewId === '' || defineRuleData?.dataViewId == null)
    ) {
      setIndexPattern(indexIndexPattern);
    }
  }, [defineRuleData?.dataViewId, defineRuleData?.index, indexIndexPattern]);

  useEffect(() => {
    const fetchSingleDataView = async () => {
      if (defineRuleData?.dataViewId != null && defineRuleData?.dataViewId !== '') {
        const dv = await data.dataViews.get(defineRuleData?.dataViewId);
        setIndexPattern(dv);
      }
    };

    fetchSingleDataView();
  }, [data.dataViews, defineRuleData, indexIndexPattern, setIndexPattern]);

  const { getFields } = form;
  const [{ severity: formSeverity, timestampOverride: formTimestampOverride }] =
    useFormData<AboutStepRule>({
      form,
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

  return (
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
                indices: indexPattern,
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
                indices: indexPattern,
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
                indices: indexPattern,
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
                indices: indexPattern,
                isDisabled: isLoading || indexPatternLoading,
                placeholder: '',
              }}
            />
            {!!formTimestampOverride && formTimestampOverride !== '@timestamp' && (
              <>
                <CommonUseField
                  path="timestampOverrideFallbackDisabled"
                  componentProps={{
                    idAria: 'detectionTimestampOverrideFallbackDisabled',
                    'data-test-subj': 'detectionTimestampOverrideFallbackDisabled',
                    euiFieldProps: {
                      disabled: isLoading,
                    },
                  }}
                />
              </>
            )}
          </EuiAccordion>
        </Form>
      </StepContentWrapper>
    </>
  );
};

export const StepAboutRule = memo(StepAboutRuleComponent);

const StepAboutRuleReadOnlyComponent: FC<StepAboutRuleReadOnlyProps> = ({
  addPadding,
  defaultValues: data,
  descriptionColumns,
}) => {
  return (
    <StepContentWrapper data-test-subj="aboutStep" addPadding={addPadding}>
      <StepRuleDescription columns={descriptionColumns} schema={defaultSchema} data={data} />
    </StepContentWrapper>
  );
};
export const StepAboutRuleReadOnly = memo(StepAboutRuleReadOnlyComponent);
