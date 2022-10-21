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
import { isEqual, isEmpty, omit } from 'lodash';
import type { FieldSpec } from '@kbn/data-views-plugin/common';
import usePrevious from 'react-use/lib/usePrevious';

import type { SavedQuery } from '@kbn/data-plugin/public';
import type { DataViewBase } from '@kbn/es-query';
import { FormattedMessage } from '@kbn/i18n-react';
import { isMlRule } from '../../../../../common/machine_learning/helpers';
import { hasMlAdminPermissions } from '../../../../../common/machine_learning/has_ml_admin_permissions';
import { hasMlLicense } from '../../../../../common/machine_learning/has_ml_license';
import { useMlCapabilities } from '../../../../common/components/ml/hooks/use_ml_capabilities';
import { useKibana } from '../../../../common/lib/kibana';
import type { EqlOptionsSelected, FieldsEqlOptions } from '../../../../../common/search_strategy';
import {
  filterRuleFieldsForType,
  getStepDataDataSource,
} from '../../../../detection_engine/rule_creation_ui/pages/rule_creation/helpers';
import type { DefineStepRule, RuleStepProps } from '../../../pages/detection_engine/rules/types';
import { RuleStep, DataSourceType } from '../../../pages/detection_engine/rules/types';
import { StepRuleDescription } from '../description_step';
import type { QueryBarDefineRuleProps } from '../query_bar';
import { QueryBarDefineRule } from '../query_bar';
import { SelectRuleType } from '../select_rule_type';
import { AnomalyThresholdSlider } from '../anomaly_threshold_slider';
import { MlJobSelect } from '../ml_job_select';
import { PickTimeline } from '../pick_timeline';
import { StepContentWrapper } from '../step_content_wrapper';
import { NextStep } from '../next_step';
import { ThresholdInput } from '../threshold_input';
import {
  Field,
  Form,
  getUseField,
  UseField,
  UseMultiFields,
  useForm,
  useFormData,
} from '../../../../shared_imports';
import { schema } from './schema';
import * as i18n from './translations';
import {
  isEqlRule,
  isNewTermsRule,
  isThreatMatchRule,
  isThresholdRule,
  isQueryRule,
} from '../../../../../common/detection_engine/utils';
import { EqlQueryBar } from '../eql_query_bar';
import { DataViewSelector } from '../data_view_selector';
import { ThreatMatchInput } from '../threatmatch_input';
import type { BrowserField } from '../../../../common/containers/source';
import { useFetchIndex } from '../../../../common/containers/source';
import { NewTermsFields } from '../new_terms_fields';
import { ScheduleItem } from '../schedule_item_form';
import { DocLink } from '../../../../common/components/links_to_docs/doc_link';
import { defaultCustomQuery } from '../../../pages/detection_engine/rules/utils';
import { getIsRulePreviewDisabled } from '../rule_preview/helpers';

const CommonUseField = getUseField({ component: Field });

const StyledVisibleContainer = styled.div<{ isVisible: boolean }>`
  display: ${(props) => (props.isVisible ? 'block' : 'none')};
`;
interface StepDefineRuleProps extends RuleStepProps {
  indicesConfig: string[];
  threatIndicesConfig: string[];
  defaultValues: DefineStepRule;
  onRuleDataChange?: (data: DefineStepRule) => void;
  onPreviewDisabledStateChange?: (isDisabled: boolean) => void;
  defaultSavedQuery?: SavedQuery;
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

const StepDefineRuleComponent: FC<StepDefineRuleProps> = ({
  addPadding = false,
  defaultValues: initialState,
  descriptionColumns = 'singleSplit',
  isReadOnlyView,
  isLoading,
  isUpdateView = false,
  onSubmit,
  setForm,
  kibanaDataViews,
  indicesConfig,
  threatIndicesConfig,
  onRuleDataChange,
  onPreviewDisabledStateChange,
  defaultSavedQuery,
}) => {
  const mlCapabilities = useMlCapabilities();
  const [openTimelineSearch, setOpenTimelineSearch] = useState(false);
  const [indexModified, setIndexModified] = useState(false);
  const [threatIndexModified, setThreatIndexModified] = useState(false);
  const [dataViewTitle, setDataViewTitle] = useState<string>();

  const { form } = useForm<DefineStepRule>({
    defaultValue: initialState,
    options: { stripEmptyFields: false },
    schema,
  });

  const { getFields, getFormData, reset, submit } = form;
  const [formData] = useFormData<DefineStepRule>({
    form,
    watch: [
      'index',
      'ruleType',
      'queryBar',
      'threshold',
      'dataViewId',
      'threshold.field',
      'threshold.value',
      'threshold.cardinality.field',
      'threshold.cardinality.value',
      'threatIndex',
      'threatMapping',
      'machineLearningJobId',
      'anomalyThreshold',
      'dataSourceType',
      'newTermsFields',
      'historyWindowSize',
      'shouldLoadQueryDynamically',
    ],
    onChange: (data: DefineStepRule) => {
      if (onRuleDataChange) {
        onRuleDataChange({
          ...data,
          eqlOptions: optionsSelected,
        });
      }
    },
  });
  const {
    index: formIndex,
    ruleType: formRuleType,
    queryBar: formQuery,
    dataViewId: formDataViewId,
    threatIndex: formThreatIndex,
    threatMapping: formThreatMapping,
    machineLearningJobId: formMachineLearningJobId,
    dataSourceType: formDataSourceType,
    newTermsFields: formNewTermsFields,
    shouldLoadQueryDynamically: formShouldLoadQueryDynamically,
  } = formData;

  const [isQueryBarValid, setIsQueryBarValid] = useState(false);
  const [isThreatQueryBarValid, setIsThreatQueryBarValid] = useState(false);
  const index = formIndex || initialState.index;
  const dataView = formDataViewId || initialState.dataViewId;
  const threatIndex = formThreatIndex || initialState.threatIndex;
  const ruleType = formRuleType || initialState.ruleType;
  const dataSourceType = formDataSourceType || initialState.dataSourceType;
  const machineLearningJobId = formMachineLearningJobId ?? initialState.machineLearningJobId;

  const [isPreviewValid, setIsPreviewValid] = useState(false);
  useEffect(() => {
    if (onPreviewDisabledStateChange) {
      onPreviewDisabledStateChange(!isPreviewValid);
    }
  }, [isPreviewValid, onPreviewDisabledStateChange]);
  useEffect(() => {
    const isDisabled = getIsRulePreviewDisabled({
      ruleType,
      isQueryBarValid,
      isThreatQueryBarValid,
      index,
      dataViewId: formDataViewId,
      dataSourceType,
      threatIndex,
      threatMapping: formThreatMapping,
      machineLearningJobId,
      queryBar: formQuery ?? initialState.queryBar,
      newTermsFields: formNewTermsFields,
    });
    setIsPreviewValid(!isDisabled);
  }, [
    dataSourceType,
    formDataViewId,
    formNewTermsFields,
    formQuery,
    formThreatMapping,
    index,
    initialState.queryBar,
    isQueryBarValid,
    isThreatQueryBarValid,
    machineLearningJobId,
    ruleType,
    threatIndex,
  ]);

  // if 'index' is selected, use these browser fields
  // otherwise use the dataview browserfields
  const previousRuleType = usePrevious(ruleType);
  const [optionsSelected, setOptionsSelected] = useState<EqlOptionsSelected>(
    initialState.eqlOptions || {}
  );
  const [isIndexPatternLoading, { browserFields, indexPatterns: initIndexPattern }] = useFetchIndex(
    index,
    false
  );
  const [indexPattern, setIndexPattern] = useState<DataViewBase>(initIndexPattern);

  const { data } = useKibana().services;

  // Why do we need this? to ensure the query bar auto-suggest gets the latest updates
  // when the index pattern changes
  // when we select new dataView
  // when we choose some other dataSourceType
  useEffect(() => {
    if (dataSourceType === DataSourceType.IndexPatterns) {
      if (!isIndexPatternLoading) {
        setIndexPattern(initIndexPattern);
      }
    }

    if (dataSourceType === DataSourceType.DataView) {
      const fetchDataView = async () => {
        if (dataView != null) {
          const dv = await data.dataViews.get(dataView);
          setDataViewTitle(dv.title);
          setIndexPattern(dv);
        }
      };

      fetchDataView();
    }
  }, [dataSourceType, isIndexPatternLoading, data, dataView, initIndexPattern]);

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

  const [aggFields, setAggregatableFields] = useState<BrowserField[]>([]);

  useEffect(() => {
    const { fields } = indexPattern;
    /**
     * Typecasting to BrowserField because fields is
     * typed as DataViewFieldBase[] which does not have
     * the 'aggregatable' property, however the type is incorrect
     *
     * fields does contain elements with the aggregatable property.
     * We will need to determine where these types are defined and
     * figure out where the discrepency is.
     */
    setAggregatableFields(aggregatableFields(fields as BrowserField[]));
  }, [indexPattern]);

  const [
    threatIndexPatternsLoading,
    { browserFields: threatBrowserFields, indexPatterns: threatIndexPatterns },
  ] = useFetchIndex(threatIndex);

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

  /**
   * When the user changes rule type to or from "threat_match" this will modify the
   * default "Custom query" string to either:
   *   * from '' to '*:*' if the type is switched to "threat_match"
   *   * from '*:*' back to '' if the type is switched back from "threat_match" to another one
   */
  useEffect(() => {
    const { queryBar } = getFields();
    if (queryBar == null) {
      return;
    }

    // NOTE: Below this code does two things that are worth commenting.

    // 1. If the user enters some text in the "Custom query" form field, we want
    // to keep it even if the user switched to another rule type. So we want to
    // be able to figure out if the field has been modified.
    // - The forms library provides properties (isPristine, isModified, isDirty)
    //   for that but they can't be used in our case: their values can be reset
    //   if you go to step 2 and then back to step 1 or the form is reset in another way.
    // - That's why we compare the actual value of the field with default ones.
    //   NOTE: It's important to do a deep object comparison by value.
    //   Don't do it by reference because the forms lib can change it internally.

    // 2. We call queryBar.reset() in both cases to not trigger validation errors
    // as the user has not entered data into those areas yet.

    // If the user switched rule type to "threat_match" from any other one,
    // but hasn't changed the custom query used for normal rules (''),
    // we reset the custom query to the default used for "threat_match" rules ('*:*').
    if (isThreatMatchRule(ruleType) && !isThreatMatchRule(previousRuleType)) {
      if (isEqual(queryBar.value, defaultCustomQuery.forNormalRules)) {
        queryBar.reset({
          defaultValue: defaultCustomQuery.forThreatMatchRules,
        });
        return;
      }
    }

    // If the user switched rule type from "threat_match" to any other one,
    // but hasn't changed the custom query used for "threat_match" rules ('*:*'),
    // we reset the custom query to another default value ('').
    if (!isThreatMatchRule(ruleType) && isThreatMatchRule(previousRuleType)) {
      if (isEqual(queryBar.value, defaultCustomQuery.forThreatMatchRules)) {
        queryBar.reset({
          defaultValue: defaultCustomQuery.forNormalRules,
        });
      }
    }
  }, [ruleType, previousRuleType, getFields]);

  // if saved query failed to load:
  // - reset shouldLoadFormDynamically to false, as non existent query cannot be used for loading and execution
  const handleSavedQueryError = useCallback(() => {
    if (!isQueryBarValid) {
      form.setFieldValue('shouldLoadQueryDynamically', false);
    }
  }, [isQueryBarValid, form]);

  const handleSubmit = useCallback(() => {
    if (onSubmit) {
      onSubmit();
    }
  }, [onSubmit]);

  const getData = useCallback(async () => {
    const result = await submit();
    result.data = {
      ...result.data,
      eqlOptions: optionsSelected,
    };
    return result.isValid
      ? result
      : {
          isValid: false,
          data: {
            ...getFormData(),
            eqlOptions: optionsSelected,
          },
        };
  }, [getFormData, optionsSelected, submit]);

  useEffect(() => {
    let didCancel = false;
    if (setForm && !didCancel) {
      setForm(RuleStep.defineRule, getData);
    }
    return () => {
      didCancel = true;
    };
  }, [getData, setForm]);

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
    ({ thresholdField, thresholdValue, thresholdCardinalityField, thresholdCardinalityValue }) => (
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
  const SourcererFlex = styled(EuiFlexItem)`
    align-items: flex-end;
  `;

  SourcererFlex.displayName = 'SourcererFlex';

  const ThreatMatchInputChildren = useCallback(
    ({ threatMapping }) => (
      <ThreatMatchInput
        handleResetThreatIndices={handleResetThreatIndices}
        indexPatterns={indexPattern}
        threatBrowserFields={threatBrowserFields}
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
      threatBrowserFields,
      threatIndexModified,
      threatIndexPatterns,
      threatIndexPatternsLoading,
    ]
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

  const DataViewSelectorMemo = useMemo(() => {
    return (
      <UseField
        key="DataViewSelector"
        path="dataViewId"
        component={DataViewSelector}
        componentProps={{
          kibanaDataViews,
        }}
      />
    );
  }, [kibanaDataViews]);

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
              {DataViewSelectorMemo}
            </StyledVisibleContainer>
            <StyledVisibleContainer isVisible={dataSourceType === DataSourceType.IndexPatterns}>
              <CommonUseField
                path="index"
                config={{
                  ...omit(schema.index, 'label'),
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
                  },
                }}
              />
            </StyledVisibleContainer>
          </EuiFlexItem>
        </EuiFlexGroup>
      </RuleTypeEuiFormRow>
    );
  }, [
    dataSourceType,
    onChangeDataSource,
    dataViewIndexPatternToggleButtonOptions,
    DataViewSelectorMemo,
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
              disabled={formShouldLoadQueryDynamically}
            >
              {i18n.IMPORT_TIMELINE_QUERY}
            </MyLabelButton>
          ),
        }}
        component={QueryBarDefineRule}
        componentProps={
          {
            browserFields,
            idAria: 'detectionEngineStepDefineRuleQueryBar',
            indexPattern,
            isDisabled: isLoading || formShouldLoadQueryDynamically,
            resetToSavedQuery: formShouldLoadQueryDynamically,
            isLoading: isIndexPatternLoading,
            dataTestSubj: 'detectionEngineStepDefineRuleQueryBar',
            openTimelineSearch,
            onValidityChange: setIsQueryBarValid,
            onCloseTimelineSearch: handleCloseTimelineSearch,
            onSavedQueryError: handleSavedQueryError,
            defaultSavedQuery,
          } as QueryBarDefineRuleProps
        }
      />
    ),
    [
      browserFields,
      handleCloseTimelineSearch,
      handleOpenTimelineSearch,
      indexPattern,
      isIndexPatternLoading,
      isLoading,
      openTimelineSearch,
      formShouldLoadQueryDynamically,
      handleSavedQueryError,
      defaultSavedQuery,
    ]
  );
  const onOptionsChange = useCallback((field: FieldsEqlOptions, value: string | undefined) => {
    setOptionsSelected((prevOptions) => ({
      ...prevOptions,
      [field]: value,
    }));
  }, []);

  const optionsData = useMemo(
    () =>
      isEmpty(indexPattern.fields)
        ? {
            keywordFields: [],
            dateFields: [],
            nonDateFields: [],
          }
        : {
            keywordFields: (indexPattern.fields as FieldSpec[])
              .filter((f) => f.esTypes?.includes('keyword'))
              .map((f) => ({ label: f.name })),
            dateFields: indexPattern.fields
              .filter((f) => f.type === 'date')
              .map((f) => ({ label: f.name })),
            nonDateFields: indexPattern.fields
              .filter((f) => f.type !== 'date')
              .map((f) => ({ label: f.name })),
          },
    [indexPattern]
  );

  const dataForDescription: Partial<DefineStepRule> = getStepDataDataSource(initialState);

  if (dataSourceType === DataSourceType.DataView) {
    dataForDescription.dataViewTitle = dataViewTitle;
  }

  return isReadOnlyView ? (
    <StepContentWrapper data-test-subj="definitionRule" addPadding={addPadding}>
      <StepRuleDescription
        columns={descriptionColumns}
        indexPatterns={indexPattern}
        schema={filterRuleFieldsForType(schema, ruleType)}
        data={filterRuleFieldsForType(dataForDescription, ruleType)}
      />
    </StepContentWrapper>
  ) : (
    <>
      <StepContentWrapper addPadding={!isUpdateView}>
        <Form form={form} data-test-subj="stepDefineRule">
          <StyledVisibleContainer isVisible={false}>
            <UseField
              path="dataSourceType"
              componentProps={{
                euiFieldProps: {
                  fullWidth: true,
                  placeholder: '',
                },
              }}
            />
          </StyledVisibleContainer>
          <UseField
            path="ruleType"
            component={SelectRuleType}
            componentProps={{
              describedByIds: ['detectionEngineStepDefineRuleType'],
              isUpdateView,
              hasValidLicense: hasMlLicense(mlCapabilities),
              isMlAdmin: hasMlAdminPermissions(mlCapabilities),
            }}
          />
          <RuleTypeEuiFormRow $isVisible={!isMlRule(ruleType)} fullWidth>
            <>
              <EuiSpacer size="s" />
              {DataSource}
              <EuiSpacer size="s" />
              {isEqlRule(ruleType) ? (
                <UseField
                  key="EqlQueryBar"
                  path="queryBar"
                  component={EqlQueryBar}
                  componentProps={{
                    optionsData,
                    optionsSelected,
                    isSizeOptionDisabled: true,
                    onOptionsChange,
                    onValidityChange: setIsQueryBarValid,
                    idAria: 'detectionEngineStepDefineRuleEqlQueryBar',
                    isDisabled: isLoading,
                    isLoading: isIndexPatternLoading,
                    indexPattern,
                    showFilterBar: true,
                    // isLoading: indexPatternsLoading,
                    dataTestSubj: 'detectionEngineStepDefineRuleEqlQueryBar',
                  }}
                  config={{
                    ...schema.queryBar,
                    label: i18n.EQL_QUERY_BAR_LABEL,
                  }}
                />
              ) : (
                QueryBarMemo
              )}
            </>
          </RuleTypeEuiFormRow>

          {isQueryRule(ruleType) && (
            <>
              <EuiSpacer size="s" />
              <RuleTypeEuiFormRow
                label={i18n.SAVED_QUERY_FORM_ROW_LABEL}
                $isVisible={Boolean(formQuery?.saved_id && formQuery?.title)}
                fullWidth
              >
                <CommonUseField
                  path="shouldLoadQueryDynamically"
                  componentProps={{
                    idAria: 'detectionEngineStepDefineRuleShouldLoadQueryDynamically',
                    'data-test-subj': 'detectionEngineStepDefineRuleShouldLoadQueryDynamically',
                    euiFieldProps: {
                      disabled: isLoading,
                      label: formQuery?.title
                        ? i18n.getSavedQueryCheckboxLabel(formQuery.title)
                        : undefined,
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
            $isVisible={isThresholdRule(ruleType)}
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
                  browserFields: aggFields,
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

      {!isUpdateView && (
        <NextStep dataTestSubj="define-continue" onClick={handleSubmit} isDisabled={isLoading} />
      )}
    </>
  );
};
export const StepDefineRule = memo(StepDefineRuleComponent);

export function aggregatableFields<T extends { aggregatable: boolean }>(browserFields: T[]): T[] {
  return browserFields.filter((field) => field.aggregatable === true);
}
