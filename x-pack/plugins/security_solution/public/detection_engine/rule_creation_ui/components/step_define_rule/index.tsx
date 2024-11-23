/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiButtonGroupOptionProps } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiButtonGroup,
  EuiText,
} from '@elastic/eui';
import type { FC } from 'react';
import React, { memo, useCallback, useState, useEffect, useMemo } from 'react';

import styled from 'styled-components';
import { i18n as i18nCore } from '@kbn/i18n';
import { isEqual } from 'lodash';
import type { FieldSpec } from '@kbn/data-plugin/common';

import type { SavedQuery } from '@kbn/data-plugin/public';
import type { DataViewBase } from '@kbn/es-query';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SetRuleQuery } from '../../../../detections/containers/detection_engine/rules/use_rule_from_timeline';
import { useRuleFromTimeline } from '../../../../detections/containers/detection_engine/rules/use_rule_from_timeline';
import { isMlRule } from '../../../../../common/machine_learning/helpers';
import { filterRuleFieldsForType, getStepDataDataSource } from '../../pages/rule_creation/helpers';
import type {
  DefineStepRule,
  RuleStepProps,
} from '../../../../detections/pages/detection_engine/rules/types';
import { DataSourceType } from '../../../../detections/pages/detection_engine/rules/types';
import { StepRuleDescription } from '../description_step';
import type { QueryBarFieldProps } from '../query_bar_field';
import { QueryBarField } from '../query_bar_field';
import { SelectRuleType } from '../select_rule_type';
import { AnomalyThresholdSlider } from '../anomaly_threshold_slider';
import { MlJobSelect } from '../../../rule_creation/components/ml_job_select';
import { PickTimeline } from '../../../rule_creation/components/pick_timeline';
import { StepContentWrapper } from '../../../rule_creation/components/step_content_wrapper';
import { ThresholdInput } from '../threshold_input';
import {
  Field,
  Form,
  getUseField,
  HiddenField,
  UseField,
  useFormData,
  UseMultiFields,
} from '../../../../shared_imports';
import type { FormHook, FieldHook } from '../../../../shared_imports';
import { schema } from './schema';
import { getTermsAggregationFields } from './utils';
import { useExperimentalFeatureFieldsTransform } from './use_experimental_feature_fields_transform';
import * as i18n from './translations';
import {
  isEqlRule,
  isNewTermsRule,
  isThreatMatchRule,
  isThresholdRule as getIsThresholdRule,
  isQueryRule,
  isEsqlRule,
  isEqlSequenceQuery,
  isSuppressionRuleInGA,
} from '../../../../../common/detection_engine/utils';
import { EqlQueryEdit } from '../../../rule_creation/components/eql_query_edit';
import { DataViewSelectorField } from '../data_view_selector_field';
import { ThreatMatchInput } from '../threatmatch_input';
import { useFetchIndex } from '../../../../common/containers/source';
import { NewTermsFields } from '../new_terms_fields';
import { ScheduleItem } from '../../../rule_creation/components/schedule_item_form';
import { RequiredFields } from '../../../rule_creation/components/required_fields';
import { DocLink } from '../../../../common/components/links_to_docs/doc_link';
import { useLicense } from '../../../../common/hooks/use_license';
import { MINIMUM_LICENSE_FOR_SUPPRESSION } from '../../../../../common/detection_engine/constants';
import { useUpsellingMessage } from '../../../../common/hooks/use_upselling';
import { useAllEsqlRuleFields } from '../../hooks';
import { useAlertSuppression } from '../../../rule_management/logic/use_alert_suppression';
import { AiAssistant } from '../ai_assistant';
import { RelatedIntegrations } from '../../../rule_creation/components/related_integrations';
import { useMLRuleConfig } from '../../../../common/components/ml/hooks/use_ml_rule_config';
import {
  ALERT_SUPPRESSION_FIELDS_FIELD_NAME,
  AlertSuppressionEdit,
} from '../../../rule_creation/components/alert_suppression_edit';
import { ThresholdAlertSuppressionEdit } from '../../../rule_creation/components/threshold_alert_suppression_edit';
import { usePersistentAlertSuppressionState } from './use_persistent_alert_suppression_state';
import { EsqlQueryEdit } from '../../../rule_creation/components/esql_query_edit';
import { usePersistentQuery } from './use_persistent_query';

const CommonUseField = getUseField({ component: Field });

const StyledVisibleContainer = styled.div<{ isVisible: boolean }>`
  display: ${(props) => (props.isVisible ? 'block' : 'none')};
`;
export interface StepDefineRuleProps extends RuleStepProps {
  indicesConfig: string[];
  threatIndicesConfig: string[];
  defaultSavedQuery?: SavedQuery;
  form: FormHook<DefineStepRule>;
  indexPattern: DataViewBase;
  isIndexPatternLoading: boolean;
  isQueryBarValid: boolean;
  setIsQueryBarValid: (valid: boolean) => void;
  setIsThreatQueryBarValid: (valid: boolean) => void;
  index: string[];
  threatIndex: string[];
  alertSuppressionFields?: string[];
  dataSourceType: DataSourceType;
  shouldLoadQueryDynamically: boolean;
  queryBarTitle: string | undefined;
  queryBarSavedId: string | null | undefined;
  thresholdFields: string[] | undefined;
}

interface StepDefineRuleReadOnlyProps {
  addPadding: boolean;
  descriptionColumns: 'multi' | 'single' | 'singleSplit';
  defaultValues: DefineStepRule;
  indexPattern: DataViewBase;
}

export const MyLabelButton = styled(EuiButtonEmpty)`
  height: 18px;
  font-size: 12px;

  .euiIcon {
    width: 14px;
    height: 14px;
  }
`;

MyLabelButton.defaultProps = {
  flush: 'right',
};

const RuleTypeEuiFormRow = styled(EuiFormRow).attrs<{ $isVisible: boolean }>(({ $isVisible }) => ({
  style: {
    display: $isVisible ? 'flex' : 'none',
  },
}))<{ $isVisible: boolean }>``;

// eslint-disable-next-line complexity
const StepDefineRuleComponent: FC<StepDefineRuleProps> = ({
  dataSourceType,
  defaultSavedQuery,
  form,
  alertSuppressionFields,
  index,
  indexPattern,
  indicesConfig,
  isIndexPatternLoading,
  isLoading,
  isQueryBarValid,
  isUpdateView = false,
  queryBarSavedId,
  queryBarTitle,
  setIsQueryBarValid,
  setIsThreatQueryBarValid,
  shouldLoadQueryDynamically,
  threatIndex,
  threatIndicesConfig,
  thresholdFields,
}) => {
  const [{ ruleType, queryBar, machineLearningJobId }] = useFormData<DefineStepRule>({
    form,
    watch: ['ruleType', 'queryBar', 'machineLearningJobId'],
  });

  const { isSuppressionEnabled: isAlertSuppressionEnabled } = useAlertSuppression(ruleType);
  const [openTimelineSearch, setOpenTimelineSearch] = useState(false);
  const [indexModified, setIndexModified] = useState(false);
  const [threatIndexModified, setThreatIndexModified] = useState(false);
  const license = useLicense();

  const {
    allJobsStarted,
    hasMlAdminPermissions,
    hasMlLicense,
    loading: mlRuleConfigLoading,
    mlSuppressionFields,
  } = useMLRuleConfig({ machineLearningJobId });

  const isMlSuppressionIncomplete =
    isMlRule(ruleType) && machineLearningJobId?.length > 0 && !allJobsStarted;

  const isAlertSuppressionLicenseValid = license.isAtLeast(MINIMUM_LICENSE_FOR_SUPPRESSION);

  const isThresholdRule = getIsThresholdRule(ruleType);
  const alertSuppressionUpsellingMessage = useUpsellingMessage('alert_suppression_rule_form');
  const { getFields, reset, setFieldValue } = form;

  // Callback for when user toggles between Data Views and Index Patterns
  const onChangeDataSource = useCallback(
    (optionId: string) => {
      form.setFieldValue('dataSourceType', optionId);
      form.getFields().index.reset({
        resetValue: false,
      });
      form.getFields().dataViewId.reset({
        resetValue: false,
      });
    },
    [form]
  );

  const aggFields = useMemo(
    () => (indexPattern.fields as FieldSpec[]).filter((field) => field.aggregatable === true),
    [indexPattern.fields]
  );
  const termsAggregationFields = useMemo(
    /**
     * Typecasting to FieldSpec because fields is
     * typed as DataViewFieldBase[] which does not have
     * the 'aggregatable' property, however the type is incorrect
     *
     * fields does contain elements with the aggregatable property.
     * We will need to determine where these types are defined and
     * figure out where the discrepency is.
     */
    () => getTermsAggregationFields(indexPattern.fields as FieldSpec[]),
    [indexPattern.fields]
  );

  const [threatIndexPatternsLoading, { indexPatterns: threatIndexPatterns }] =
    useFetchIndex(threatIndex);

  // reset form when rule type changes
  useEffect(() => {
    reset({ resetValues: false });
  }, [reset, ruleType]);

  useEffect(() => {
    setIndexModified(!isEqual(index, indicesConfig));
  }, [index, indicesConfig]);

  useEffect(() => {
    setThreatIndexModified(!isEqual(threatIndex, threatIndicesConfig));
  }, [threatIndex, threatIndicesConfig]);

  const { setPersistentEqlQuery, setPersistentEqlOptions } = usePersistentQuery({
    form,
  });
  usePersistentAlertSuppressionState({ form });

  const handleSetRuleFromTimeline = useCallback<SetRuleQuery>(
    ({ index: timelineIndex, queryBar: timelineQueryBar, eqlOptions }) => {
      const setQuery = () => {
        setPersistentEqlQuery(timelineQueryBar);
        setFieldValue('index', timelineIndex);
        setFieldValue('queryBar', timelineQueryBar);
      };
      if (timelineQueryBar.query.language === 'eql') {
        setFieldValue('ruleType', 'eql');

        // Forms needs to be re-rendered with a new rule type first
        // setTimeout is used to delay setting rule type specific values.
        // Without that form turns out in an "impossible" state.
        setTimeout(() => {
          setPersistentEqlOptions(eqlOptions ?? {});
          setQuery();
          setFieldValue('eqlOptions', eqlOptions ?? {});
        });
      } else {
        setQuery();
      }
    },
    [setFieldValue, setPersistentEqlQuery, setPersistentEqlOptions]
  );

  const { onOpenTimeline, loading: timelineQueryLoading } =
    useRuleFromTimeline(handleSetRuleFromTimeline);

  // if saved query failed to load:
  // - reset shouldLoadFormDynamically to false, as non existent query cannot be used for loading and execution
  const handleSavedQueryError = useCallback(() => {
    if (!isQueryBarValid) {
      form.setFieldValue('shouldLoadQueryDynamically', false);
    }
  }, [isQueryBarValid, form]);

  const handleResetIndices = useCallback(() => {
    const indexField = getFields().index;
    indexField.setValue(indicesConfig);
  }, [getFields, indicesConfig]);

  const handleResetThreatIndices = useCallback(() => {
    const threatIndexField = getFields().threatIndex;
    threatIndexField.setValue(threatIndicesConfig);
  }, [getFields, threatIndicesConfig]);

  const handleOpenTimelineSearch = useCallback(() => {
    setOpenTimelineSearch(true);
  }, []);

  const handleCloseTimelineSearch = useCallback(() => {
    setOpenTimelineSearch(false);
  }, []);

  const ThresholdInputChildren = useCallback(
    ({
      thresholdField,
      thresholdValue,
      thresholdCardinalityField,
      thresholdCardinalityValue,
    }: Record<string, FieldHook>) => (
      <ThresholdInput
        browserFields={aggFields}
        thresholdField={thresholdField}
        thresholdValue={thresholdValue}
        thresholdCardinalityField={thresholdCardinalityField}
        thresholdCardinalityValue={thresholdCardinalityValue}
      />
    ),
    [aggFields]
  );

  const ThreatMatchInputChildren = useCallback(
    ({ threatMapping }: Record<string, FieldHook>) => (
      <ThreatMatchInput
        handleResetThreatIndices={handleResetThreatIndices}
        indexPatterns={indexPattern}
        threatIndexModified={threatIndexModified}
        threatIndexPatterns={threatIndexPatterns}
        threatIndexPatternsLoading={threatIndexPatternsLoading}
        threatMapping={threatMapping}
        onValidityChange={setIsThreatQueryBarValid}
      />
    ),
    [
      handleResetThreatIndices,
      indexPattern,
      setIsThreatQueryBarValid,
      threatIndexModified,
      threatIndexPatterns,
      threatIndexPatternsLoading,
    ]
  );

  const { fields: esqlSuppressionFields, isLoading: isEsqlSuppressionLoading } =
    useAllEsqlRuleFields({
      esqlQuery: isEsqlRule(ruleType) ? (queryBar?.query?.query as string) : undefined,
      indexPatternsFields: indexPattern.fields,
    });

  /** Suppression fields being selected is a special case for our form logic, as we can't
   * disable these fields and leave users in a bad state that they cannot change.
   * The exception is threshold rules, which use an existing threshold field for the same
   * purpose and so are treated as if the field is always selected.  */
  const areSuppressionFieldsSelected = isThresholdRule || Boolean(alertSuppressionFields?.length);

  const areSuppressionFieldsDisabledBySequence =
    isEqlRule(ruleType) &&
    isEqlSequenceQuery(queryBar?.query?.query as string) &&
    alertSuppressionFields?.length === 0;

  /** If we don't have ML field information, users can't meaningfully interact with suppression fields */
  const areSuppressionFieldsDisabledByMlFields =
    isMlRule(ruleType) && (mlRuleConfigLoading || !mlSuppressionFields.length);

  /** Suppression fields are generally disabled if either:
   * - License is insufficient (i.e. less than platinum)
   * - An EQL Sequence is used
   * - ML Field information is not available
   */
  const areSuppressionFieldsDisabled =
    !isAlertSuppressionLicenseValid ||
    areSuppressionFieldsDisabledBySequence ||
    areSuppressionFieldsDisabledByMlFields;

  const isSuppressionGroupByDisabled =
    (areSuppressionFieldsDisabled || isEsqlSuppressionLoading) && !areSuppressionFieldsSelected;

  const suppressionGroupByDisabledText = useMemo(() => {
    if (areSuppressionFieldsDisabledBySequence) {
      return i18n.EQL_SEQUENCE_SUPPRESSION_DISABLE_TOOLTIP;
    } else if (areSuppressionFieldsDisabledByMlFields) {
      return i18n.MACHINE_LEARNING_SUPPRESSION_DISABLED_LABEL;
    } else {
      return alertSuppressionUpsellingMessage;
    }
  }, [
    alertSuppressionUpsellingMessage,
    areSuppressionFieldsDisabledByMlFields,
    areSuppressionFieldsDisabledBySequence,
  ]);

  const suppressionGroupByFields = useMemo(() => {
    if (isEsqlRule(ruleType)) {
      return esqlSuppressionFields;
    } else if (isMlRule(ruleType)) {
      return mlSuppressionFields;
    } else {
      return termsAggregationFields;
    }
  }, [esqlSuppressionFields, mlSuppressionFields, ruleType, termsAggregationFields]);

  const alertSuppressionFieldsAppendText = useMemo(
    () => (
      <EuiText color="subdued" size="xs">
        {isSuppressionRuleInGA(ruleType)
          ? i18n.ALERT_SUPPRESSION_FIELDS_GA_LABEL_APPEND
          : i18n.ALERT_SUPPRESSION_FIELDS_TECH_PREVIEW_LABEL_APPEND}
      </EuiText>
    ),
    [ruleType]
  );

  const dataViewIndexPatternToggleButtonOptions: EuiButtonGroupOptionProps[] = useMemo(
    () => [
      {
        id: DataSourceType.IndexPatterns,
        label: i18nCore.translate(
          'xpack.securitySolution.ruleDefine.indexTypeSelect.indexPattern',
          {
            defaultMessage: 'Index Patterns',
          }
        ),
        iconType: dataSourceType === DataSourceType.IndexPatterns ? 'checkInCircleFilled' : 'empty',
        'data-test-subj': `rule-index-toggle-${DataSourceType.IndexPatterns}`,
      },
      {
        id: DataSourceType.DataView,
        label: i18nCore.translate('xpack.securitySolution.ruleDefine.indexTypeSelect.dataView', {
          defaultMessage: 'Data View',
        }),
        iconType: dataSourceType === DataSourceType.DataView ? 'checkInCircleFilled' : 'empty',
        'data-test-subj': `rule-index-toggle-${DataSourceType.DataView}`,
      },
    ],
    [dataSourceType]
  );

  const DataSource = useMemo(() => {
    return (
      <RuleTypeEuiFormRow label={i18n.SOURCE} $isVisible={true} fullWidth>
        <EuiFlexGroup
          direction="column"
          gutterSize="s"
          data-test-subj="dataViewIndexPatternButtonGroupFlexGroup"
        >
          <EuiFlexItem>
            <EuiText size="xs">
              <FormattedMessage
                id="xpack.securitySolution.dataViewSelectorText1"
                defaultMessage="Use Kibana "
              />
              <DocLink guidePath="kibana" docPath="data-views.html" linkText="Data Views" />
              <FormattedMessage
                id="xpack.securitySolution.dataViewSelectorText2"
                defaultMessage=" or specify individual "
              />
              <DocLink
                guidePath="kibana"
                docPath="index-patterns-api-create.html"
                linkText="index patterns"
              />
              <FormattedMessage
                id="xpack.securitySolution.dataViewSelectorText3"
                defaultMessage=" as your rule's data source to be searched."
              />
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <RuleTypeEuiFormRow $isVisible={true}>
              <EuiButtonGroup
                isFullWidth={true}
                legend="Rule index pattern or data view selector"
                data-test-subj="dataViewIndexPatternButtonGroup"
                idSelected={dataSourceType}
                onChange={onChangeDataSource}
                options={dataViewIndexPatternToggleButtonOptions}
                color="primary"
              />
            </RuleTypeEuiFormRow>
          </EuiFlexItem>

          <EuiFlexItem>
            <StyledVisibleContainer isVisible={dataSourceType === DataSourceType.DataView}>
              <UseField
                key="DataViewSelector"
                path="dataViewId"
                component={DataViewSelectorField}
              />
            </StyledVisibleContainer>
            <StyledVisibleContainer isVisible={dataSourceType === DataSourceType.IndexPatterns}>
              <CommonUseField
                path="index"
                config={{
                  ...schema.index,
                  labelAppend: indexModified ? (
                    <MyLabelButton onClick={handleResetIndices} iconType="refresh">
                      {i18n.RESET_DEFAULT_INDEX}
                    </MyLabelButton>
                  ) : null,
                }}
                componentProps={{
                  idAria: 'detectionEngineStepDefineRuleIndices',
                  'data-test-subj': 'detectionEngineStepDefineRuleIndices',
                  euiFieldProps: {
                    fullWidth: true,
                    placeholder: '',
                    isDisabled: timelineQueryLoading,
                    isLoading: timelineQueryLoading,
                  },
                }}
              />
            </StyledVisibleContainer>
          </EuiFlexItem>
        </EuiFlexGroup>
      </RuleTypeEuiFormRow>
    );
  }, [
    timelineQueryLoading,
    dataSourceType,
    onChangeDataSource,
    dataViewIndexPatternToggleButtonOptions,
    indexModified,
    handleResetIndices,
  ]);

  const QueryBarMemo = useMemo(
    () => (
      <UseField
        key="QueryBarDefineRule"
        path="queryBar"
        config={{
          ...schema.queryBar,
          label: i18n.QUERY_BAR_LABEL,
          labelAppend: (
            <MyLabelButton
              data-test-subj="importQueryFromSavedTimeline"
              onClick={handleOpenTimelineSearch}
              disabled={shouldLoadQueryDynamically}
            >
              {i18n.IMPORT_TIMELINE_QUERY}
            </MyLabelButton>
          ),
        }}
        component={QueryBarField}
        componentProps={
          {
            idAria: 'detectionEngineStepDefineRuleQueryBar',
            indexPattern,
            isDisabled: isLoading || shouldLoadQueryDynamically || timelineQueryLoading,
            resetToSavedQuery: shouldLoadQueryDynamically,
            isLoading: isIndexPatternLoading || timelineQueryLoading,
            dataTestSubj: 'detectionEngineStepDefineRuleQueryBar',
            openTimelineSearch,
            onValidityChange: setIsQueryBarValid,
            onCloseTimelineSearch: handleCloseTimelineSearch,
            onSavedQueryError: handleSavedQueryError,
            defaultSavedQuery,
            onOpenTimeline,
          } as QueryBarFieldProps
        }
      />
    ),
    [
      handleOpenTimelineSearch,
      shouldLoadQueryDynamically,
      indexPattern,
      isLoading,
      timelineQueryLoading,
      isIndexPatternLoading,
      openTimelineSearch,
      setIsQueryBarValid,
      handleCloseTimelineSearch,
      handleSavedQueryError,
      defaultSavedQuery,
      onOpenTimeline,
    ]
  );

  const selectRuleTypeProps = useMemo(
    () => ({
      describedByIds: ['detectionEngineStepDefineRuleType'],
      isUpdateView,
      hasValidLicense: hasMlLicense,
      isMlAdmin: hasMlAdminPermissions,
    }),
    [hasMlAdminPermissions, hasMlLicense, isUpdateView]
  );

  return (
    <>
      <StepContentWrapper addPadding={!isUpdateView}>
        <Form form={form} data-test-subj="stepDefineRule">
          <UseField
            path="dataSourceType"
            component={HiddenField}
            componentProps={{
              euiFieldProps: {
                fullWidth: true,
                placeholder: '',
              },
            }}
          />
          <UseField
            path="ruleType"
            component={SelectRuleType}
            componentProps={selectRuleTypeProps}
          />
          <RuleTypeEuiFormRow $isVisible={!isMlRule(ruleType) && !isEsqlRule(ruleType)} fullWidth>
            <>
              <EuiSpacer size="s" />
              {DataSource}
            </>
          </RuleTypeEuiFormRow>
          <RuleTypeEuiFormRow
            $isVisible={!isMlRule(ruleType)}
            fullWidth
            data-test-subj="defineRuleFormStepQueryEditor"
          >
            <>
              <EuiSpacer size="s" />
              {isEqlRule(ruleType) ? (
                <EqlQueryEdit
                  path="queryBar"
                  eqlOptionsPath="eqlOptions"
                  fieldsToValidateOnChange={ALERT_SUPPRESSION_FIELDS_FIELD_NAME}
                  required
                  showFilterBar
                  dataView={indexPattern}
                  loading={isIndexPatternLoading}
                  disabled={isLoading}
                  onValidityChange={setIsQueryBarValid}
                />
              ) : isEsqlRule(ruleType) ? (
                <EsqlQueryEdit
                  path="queryBar"
                  fieldsToValidateOnChange={ALERT_SUPPRESSION_FIELDS_FIELD_NAME}
                  required
                  dataView={indexPattern}
                  disabled={isLoading}
                  loading={isLoading}
                  onValidityChange={setIsQueryBarValid}
                />
              ) : (
                QueryBarMemo
              )}
            </>
          </RuleTypeEuiFormRow>
          {!isMlRule(ruleType) && !isQueryBarValid && queryBar?.query?.query && (
            <AiAssistant
              getFields={form.getFields}
              setFieldValue={form.setFieldValue}
              language={queryBar?.query?.language}
            />
          )}
          {isQueryRule(ruleType) && (
            <>
              <EuiSpacer size="s" />
              <RuleTypeEuiFormRow
                label={i18n.SAVED_QUERY_FORM_ROW_LABEL}
                $isVisible={Boolean(queryBarSavedId)}
                fullWidth
              >
                <CommonUseField
                  path="shouldLoadQueryDynamically"
                  componentProps={{
                    idAria: 'detectionEngineStepDefineRuleShouldLoadQueryDynamically',
                    'data-test-subj': 'detectionEngineStepDefineRuleShouldLoadQueryDynamically',
                    euiFieldProps: {
                      disabled: isLoading,
                      label: queryBarTitle
                        ? i18n.getSavedQueryCheckboxLabel(queryBarTitle)
                        : i18n.getSavedQueryCheckboxLabelWithoutName(),
                    },
                  }}
                />
              </RuleTypeEuiFormRow>
            </>
          )}
          <RuleTypeEuiFormRow $isVisible={isMlRule(ruleType)} fullWidth>
            <>
              <UseField
                path="machineLearningJobId"
                component={MlJobSelect}
                componentProps={{
                  describedByIds: ['detectionEngineStepDefineRulemachineLearningJobId'],
                }}
              />
              <UseField
                path="anomalyThreshold"
                component={AnomalyThresholdSlider}
                componentProps={{
                  describedByIds: ['detectionEngineStepDefineRuleAnomalyThreshold'],
                }}
              />
            </>
          </RuleTypeEuiFormRow>
          <RuleTypeEuiFormRow
            $isVisible={isThresholdRule}
            data-test-subj="thresholdInput"
            fullWidth
          >
            <>
              <UseMultiFields
                fields={{
                  thresholdField: {
                    path: 'threshold.field',
                  },
                  thresholdValue: {
                    path: 'threshold.value',
                  },
                  thresholdCardinalityField: {
                    path: 'threshold.cardinality.field',
                  },
                  thresholdCardinalityValue: {
                    path: 'threshold.cardinality.value',
                  },
                }}
              >
                {ThresholdInputChildren}
              </UseMultiFields>
            </>
          </RuleTypeEuiFormRow>
          <RuleTypeEuiFormRow
            $isVisible={isThreatMatchRule(ruleType)}
            data-test-subj="threatMatchInput"
            fullWidth
          >
            <>
              <UseMultiFields
                fields={{
                  threatMapping: {
                    path: 'threatMapping',
                  },
                }}
              >
                {ThreatMatchInputChildren}
              </UseMultiFields>
            </>
          </RuleTypeEuiFormRow>
          <RuleTypeEuiFormRow
            $isVisible={isNewTermsRule(ruleType)}
            data-test-subj="newTermsInput"
            fullWidth
          >
            <>
              <UseField
                path="newTermsFields"
                component={NewTermsFields}
                componentProps={{
                  browserFields: termsAggregationFields,
                }}
              />
              <UseField
                path="historyWindowSize"
                component={ScheduleItem}
                componentProps={{
                  idAria: 'detectionEngineStepDefineRuleHistoryWindowSize',
                  dataTestSubj: 'detectionEngineStepDefineRuleHistoryWindowSize',
                  timeTypes: ['m', 'h', 'd'],
                }}
              />
            </>
          </RuleTypeEuiFormRow>
          <EuiSpacer size="m" />

          <RuleTypeEuiFormRow $isVisible={isAlertSuppressionEnabled} fullWidth>
            {isThresholdRule ? (
              <ThresholdAlertSuppressionEdit
                suppressionFieldNames={thresholdFields}
                disabled={!isAlertSuppressionLicenseValid}
                disabledText={alertSuppressionUpsellingMessage}
              />
            ) : (
              <AlertSuppressionEdit
                suppressibleFields={suppressionGroupByFields}
                labelAppend={alertSuppressionFieldsAppendText}
                warningText={
                  isMlSuppressionIncomplete
                    ? i18n.MACHINE_LEARNING_SUPPRESSION_INCOMPLETE_LABEL
                    : undefined
                }
                disabled={isSuppressionGroupByDisabled}
                disabledText={suppressionGroupByDisabledText}
              />
            )}
          </RuleTypeEuiFormRow>
          {!isMlRule(ruleType) && (
            <>
              <RequiredFields
                path="requiredFields"
                indexPatternFields={indexPattern.fields}
                isIndexPatternLoading={isIndexPatternLoading}
              />
              <EuiSpacer size="l" />
            </>
          )}
          <RelatedIntegrations path="relatedIntegrations" dataTestSubj="relatedIntegrations" />
          <UseField
            path="timeline"
            component={PickTimeline}
            componentProps={{
              idAria: 'detectionEngineStepDefineRuleTimeline',
              isDisabled: isLoading,
              dataTestSubj: 'detectionEngineStepDefineRuleTimeline',
            }}
          />
        </Form>
      </StepContentWrapper>
    </>
  );
};
export const StepDefineRule = memo(StepDefineRuleComponent);

const StepDefineRuleReadOnlyComponent: FC<StepDefineRuleReadOnlyProps> = ({
  addPadding,
  defaultValues: data,
  descriptionColumns,
  indexPattern,
}) => {
  const dataForDescription: Partial<DefineStepRule> = getStepDataDataSource(data);
  const transformFields = useExperimentalFeatureFieldsTransform();

  return (
    <StepContentWrapper data-test-subj="definitionRule" addPadding={addPadding}>
      <StepRuleDescription
        columns={descriptionColumns}
        schema={filterRuleFieldsForType(schema, data.ruleType)}
        data={filterRuleFieldsForType(transformFields(dataForDescription), data.ruleType)}
        indexPatterns={indexPattern}
      />
    </StepContentWrapper>
  );
};
export const StepDefineRuleReadOnly = memo(StepDefineRuleReadOnlyComponent);
