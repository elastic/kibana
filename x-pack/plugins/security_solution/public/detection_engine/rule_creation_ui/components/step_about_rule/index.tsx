/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiFlexItem, EuiSpacer, EuiFormRow, EuiToolTip } from '@elastic/eui';
import type { FC } from 'react';
import React, { memo, useCallback, useEffect, useState, useMemo } from 'react';
import styled from 'styled-components';

import type { DataViewBase } from '@kbn/es-query';
import type { Severity, Type } from '@kbn/securitysolution-io-ts-alerting-types';

import type { RuleSource } from '../../../../../common/api/detection_engine';
import { isThreatMatchRule, isEsqlRule } from '../../../../../common/detection_engine/utils';
import type {
  RuleStepProps,
  AboutStepRule,
} from '../../../../detections/pages/detection_engine/rules/types';
import { AddItem } from '../add_item_form';
import { StepRuleDescription } from '../description_step';
import { AddMitreAttackThreat } from '../mitre';
import type { FieldHook, FormHook } from '../../../../shared_imports';
import { Field, Form, getUseField, UseField } from '../../../../shared_imports';

import { defaultRiskScoreBySeverity } from './data';
import { isUrlInvalid } from '../../../../common/utils/validators';
import { schema as defaultSchema } from './schema';
import * as I18n from './translations';
import { StepContentWrapper } from '../../../rule_creation/components/step_content_wrapper';
import { MarkdownEditorForm } from '../../../../common/components/markdown_editor/eui_form';
import { SeverityField } from '../severity_mapping';
import { RiskScoreField } from '../risk_score_mapping';
import { EsFieldSelectorField } from '../es_field_selector_field';
import { useFetchIndex } from '../../../../common/containers/source';
import {
  DEFAULT_INDICATOR_SOURCE_PATH,
  DEFAULT_MAX_SIGNALS,
} from '../../../../../common/constants';
import { useKibana } from '../../../../common/lib/kibana';
import { useRuleIndices } from '../../../rule_management/logic/use_rule_indices';
import { EsqlAutocomplete } from '../esql_autocomplete';
import { MultiSelectFieldsAutocomplete } from '../multi_select_fields';
import { useAllEsqlRuleFields } from '../../hooks';
import { MaxSignals } from '../max_signals';

const CommonUseField = getUseField({ component: Field });

interface StepAboutRuleProps extends RuleStepProps {
  ruleType: Type;
  machineLearningJobId: string[];
  index: string[];
  dataViewId: string | undefined;
  timestampOverride: string;
  form: FormHook<AboutStepRule>;
  esqlQuery?: string | undefined;
  ruleSource?: RuleSource;
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
  ruleType,
  machineLearningJobId,
  index,
  dataViewId,
  timestampOverride,
  isUpdateView = false,
  isLoading,
  form,
  esqlQuery,
  ruleSource,
}) => {
  const { data } = useKibana().services;

  const isThreatMatchRuleValue = useMemo(() => isThreatMatchRule(ruleType), [ruleType]);
  const isEsqlRuleValue = useMemo(() => isEsqlRule(ruleType), [ruleType]);

  const { ruleIndices } = useRuleIndices(machineLearningJobId, index);

  /**
   * 1. if not null, fetch data view from id saved on rule form
   * 2. Create a state to set the indexPattern to be used
   * 3. useEffect if indexIndexPattern is updated and dataView from rule form is empty
   */

  const [indexPatternLoading, { indexPatterns: indexIndexPattern }] = useFetchIndex(ruleIndices);

  const [indexPattern, setIndexPattern] = useState<DataViewBase>(indexIndexPattern);

  useEffect(() => {
    if (index != null && (dataViewId === '' || dataViewId == null)) {
      setIndexPattern(indexIndexPattern);
    }
  }, [dataViewId, index, indexIndexPattern]);

  useEffect(() => {
    const fetchSingleDataView = async () => {
      if (dataViewId != null && dataViewId !== '') {
        const dv = await data.dataViews.get(dataViewId);
        setIndexPattern(dv);
      }
    };

    fetchSingleDataView();
  }, [data.dataViews, dataViewId, indexIndexPattern, setIndexPattern]);

  const { getFields } = form;

  const setRiskScore = useCallback(
    (severity: Severity) => {
      const newRiskScoreValue = defaultRiskScoreBySeverity[severity];
      if (newRiskScoreValue != null) {
        const riskScoreField = getFields().riskScore as FieldHook<AboutStepRule['riskScore']>;
        riskScoreField.setValue({ ...riskScoreField.value, value: newRiskScoreValue });
      }
    },
    [getFields]
  );

  const { fields: investigationFields, isLoading: isInvestigationFieldsLoading } =
    useAllEsqlRuleFields({
      esqlQuery: isEsqlRuleValue ? esqlQuery : undefined,
      indexPatternsFields: indexPattern.fields,
    });

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
                indices: indexPattern,
                setRiskScore,
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
              path="investigationFields"
              component={MultiSelectFieldsAutocomplete}
              componentProps={{
                browserFields: investigationFields,
                isDisabled: isLoading || indexPatternLoading || isInvestigationFieldsLoading,
                fullWidth: true,
                dataTestSubj: 'detectionEngineStepAboutRuleInvestigationFields',
              }}
            />
            <EuiSpacer size="l" />
            <UseField
              path="setup"
              component={MarkdownEditorForm}
              componentProps={{
                idAria: 'detectionEngineStepAboutRuleSetup',
                isDisabled: isLoading,
                dataTestSubj: 'detectionEngineStepAboutRuleSetup',
                placeholder: I18n.ADD_RULE_SETUP_HELP_TEXT,
                includePlugins: false,
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
            <EuiToolTip
              content={
                ruleSource?.type === 'external'
                  ? I18n.AUTHOR_IMMUTABLE_FIELD_TOOLTIP_TEXT
                  : undefined
              }
              display="block"
              position="right"
            >
              <CommonUseField
                path="author"
                componentProps={{
                  idAria: 'detectionEngineStepAboutRuleAuthor',
                  'data-test-subj': 'detectionEngineStepAboutRuleAuthor',
                  euiFieldProps: {
                    fullWidth: true,
                    isDisabled: isLoading || ruleSource?.type === 'external', // We don't allow "author" customization if this is a prebuilt rule
                    placeholder: '',
                  },
                }}
              />
            </EuiToolTip>
            <EuiSpacer size="l" />
            <EuiToolTip
              content={
                ruleSource?.type === 'external'
                  ? I18n.LICENSE_IMMUTABLE_FIELD_TOOLTIP_TEXT
                  : undefined
              }
              display="block"
              position="right"
            >
              <CommonUseField
                path="license"
                componentProps={{
                  idAria: 'detectionEngineStepAboutRuleLicense',
                  'data-test-subj': 'detectionEngineStepAboutRuleLicense',
                  euiFieldProps: {
                    fullWidth: true,
                    disabled: isLoading || ruleSource?.type === 'external', // We don't allow "license" customization if this is a prebuilt rule
                    placeholder: '',
                  },
                }}
              />
            </EuiToolTip>
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
            <EuiFormRow fullWidth>
              <UseField
                path="maxSignals"
                component={MaxSignals}
                componentProps={{
                  idAria: 'detectionEngineStepAboutRuleMaxSignals',
                  dataTestSubj: 'detectionEngineStepAboutRuleMaxSignals',
                  isDisabled: isLoading,
                  placeholder: DEFAULT_MAX_SIGNALS,
                }}
              />
            </EuiFormRow>
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
            {isEsqlRuleValue ? (
              <UseField
                path="ruleNameOverride"
                component={EsqlAutocomplete}
                componentProps={{
                  dataTestSubj: 'detectionEngineStepAboutRuleRuleNameOverrideForEsqlRuleType',
                  idAria: 'detectionEngineStepAboutRuleRuleNameOverrideForEsqlRuleType',
                  esqlQuery,
                  fieldType: 'string',
                  isDisabled: isLoading,
                }}
              />
            ) : (
              <UseField
                path="ruleNameOverride"
                component={EsFieldSelectorField}
                componentProps={{
                  dataTestSubj: 'detectionEngineStepAboutRuleRuleNameOverride',
                  fieldType: 'string',
                  idAria: 'detectionEngineStepAboutRuleRuleNameOverride',
                  indices: indexPattern,
                  isDisabled: isLoading || indexPatternLoading,
                }}
              />
            )}

            <EuiSpacer size="l" />
            <UseField
              path="timestampOverride"
              component={EsFieldSelectorField}
              componentProps={{
                dataTestSubj: 'detectionEngineStepAboutRuleTimestampOverride',
                fieldType: 'date',
                idAria: 'detectionEngineStepAboutRuleTimestampOverride',
                indices: indexPattern,
                isDisabled: isLoading || indexPatternLoading,
              }}
            />
            {!!timestampOverride && timestampOverride !== '@timestamp' && (
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
