/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataViewBase } from '@kbn/es-query';
import { isThreatMatchRule } from '../../../../common/detection_engine/utils';
import type {
  AboutStepRule,
  ActionsStepRule,
  DefineStepRule,
  ScheduleStepRule,
} from '../../../detections/pages/detection_engine/rules/types';
import { DataSourceType } from '../../../detections/pages/detection_engine/rules/types';
import { useKibana } from '../../../common/lib/kibana';
import type { FormHook, ValidationError } from '../../../shared_imports';
import { useForm, useFormData } from '../../../shared_imports';
import { schema as defineRuleSchema } from '../components/step_define_rule/schema';
import type { EqlOptionsSelected } from '../../../../common/search_strategy';
import {
  schema as aboutRuleSchema,
  threatMatchAboutSchema,
} from '../components/step_about_rule/schema';
import { schema as scheduleRuleSchema } from '../components/step_schedule_rule/schema';
import { getSchema as getActionsRuleSchema } from '../../rule_creation/components/step_rule_actions/get_schema';
import { useFetchIndex } from '../../../common/containers/source';
import { ERROR_CODES as ESQL_ERROR_CODES } from '../../rule_creation/logic/esql_validator';
import { EQL_ERROR_CODES } from '../../../common/hooks/eql/api';
import * as i18n from './translations';

export interface UseRuleFormsProps {
  defineStepDefault: DefineStepRule;
  aboutStepDefault: AboutStepRule;
  scheduleStepDefault: ScheduleStepRule;
  actionsStepDefault: ActionsStepRule;
}

export const useRuleForms = ({
  defineStepDefault,
  aboutStepDefault,
  scheduleStepDefault,
  actionsStepDefault,
}: UseRuleFormsProps) => {
  const {
    triggersActionsUi: { actionTypeRegistry },
  } = useKibana().services;
  // DEFINE STEP FORM
  const { form: defineStepForm } = useForm<DefineStepRule>({
    defaultValue: defineStepDefault,
    options: { stripEmptyFields: false },
    schema: defineRuleSchema,
  });
  const [eqlOptionsSelected, setEqlOptionsSelected] = useState<EqlOptionsSelected>(
    defineStepDefault.eqlOptions
  );
  const [defineStepFormData] = useFormData<DefineStepRule | {}>({
    form: defineStepForm,
  });
  // FormData doesn't populate on the first render, so we use the defaultValue if the formData
  // doesn't have what we wanted
  const defineStepData = useMemo(
    () =>
      'index' in defineStepFormData
        ? { ...defineStepFormData, eqlOptions: eqlOptionsSelected }
        : defineStepDefault,
    [defineStepDefault, defineStepFormData, eqlOptionsSelected]
  );

  // ABOUT STEP FORM
  const typeDependentAboutRuleSchema = useMemo(
    () => (isThreatMatchRule(defineStepData.ruleType) ? threatMatchAboutSchema : aboutRuleSchema),
    [defineStepData.ruleType]
  );
  const { form: aboutStepForm } = useForm<AboutStepRule>({
    defaultValue: aboutStepDefault,
    options: { stripEmptyFields: false },
    schema: typeDependentAboutRuleSchema,
  });
  const [aboutStepFormData] = useFormData<AboutStepRule | {}>({
    form: aboutStepForm,
  });
  const aboutStepData = 'name' in aboutStepFormData ? aboutStepFormData : aboutStepDefault;

  // SCHEDULE STEP FORM
  const { form: scheduleStepForm } = useForm<ScheduleStepRule>({
    defaultValue: scheduleStepDefault,
    options: { stripEmptyFields: false },
    schema: scheduleRuleSchema,
  });
  const [scheduleStepFormData] = useFormData<ScheduleStepRule | {}>({
    form: scheduleStepForm,
  });
  const scheduleStepData =
    'interval' in scheduleStepFormData ? scheduleStepFormData : scheduleStepDefault;

  // ACTIONS STEP FORM
  const schema = useMemo(() => getActionsRuleSchema({ actionTypeRegistry }), [actionTypeRegistry]);
  const { form: actionsStepForm } = useForm<ActionsStepRule>({
    defaultValue: actionsStepDefault,
    options: { stripEmptyFields: false },
    schema,
  });
  const [actionsStepFormData] = useFormData<ActionsStepRule | {}>({
    form: actionsStepForm,
  });
  const actionsStepData =
    'actions' in actionsStepFormData ? actionsStepFormData : actionsStepDefault;

  return {
    defineStepForm,
    defineStepData,
    aboutStepForm,
    aboutStepData,
    scheduleStepForm,
    scheduleStepData,
    actionsStepForm,
    actionsStepData,
    eqlOptionsSelected,
    setEqlOptionsSelected,
  };
};

interface UseRuleIndexPatternProps {
  dataSourceType: DataSourceType;
  index: string[];
  dataViewId: string | undefined;
}

export const useRuleIndexPattern = ({
  dataSourceType,
  index,
  dataViewId,
}: UseRuleIndexPatternProps) => {
  const { data } = useKibana().services;
  const [isIndexPatternLoading, { browserFields, indexPatterns: initIndexPattern }] =
    useFetchIndex(index);
  const [indexPattern, setIndexPattern] = useState<DataViewBase>(initIndexPattern);
  // Why do we need this? to ensure the query bar auto-suggest gets the latest updates
  // when the index pattern changes
  // when we select new dataView
  // when we choose some other dataSourceType
  useEffect(() => {
    if (dataSourceType === DataSourceType.IndexPatterns && !isIndexPatternLoading) {
      setIndexPattern(initIndexPattern);
    }

    if (dataSourceType === DataSourceType.DataView) {
      const fetchDataView = async () => {
        if (dataViewId != null) {
          const dv = await data.dataViews.get(dataViewId);
          setIndexPattern(dv);
        }
      };

      fetchDataView();
    }
  }, [dataSourceType, isIndexPatternLoading, data, dataViewId, initIndexPattern]);
  return { indexPattern, isIndexPatternLoading, browserFields };
};

export interface UseRuleFormsErrors {
  defineStepForm?: FormHook<DefineStepRule, DefineStepRule>;
  aboutStepForm?: FormHook<AboutStepRule, AboutStepRule>;
  scheduleStepForm?: FormHook<ScheduleStepRule, ScheduleStepRule>;
  actionsStepForm?: FormHook<ActionsStepRule, ActionsStepRule>;
}

const getFieldErrorMessages = (fieldError: ValidationError) => {
  if (fieldError.message.length > 0) {
    return [fieldError.message];
  } else if (Array.isArray(fieldError.messages)) {
    // EQL validation can return multiple errors and thus we store them in a custom `messages` field on `ValidationError` object.
    // Here we double check that `messages` is in fact an array and the content is of type `string`, otherwise we stringify it.
    return fieldError.messages.map((message) =>
      typeof message === 'string' ? message : JSON.stringify(message)
    );
  }
  return [];
};

const NON_BLOCKING_QUERY_BAR_ERROR_CODES = [
  ESQL_ERROR_CODES.INVALID_ESQL,
  EQL_ERROR_CODES.FAILED_REQUEST,
  EQL_ERROR_CODES.INVALID_EQL,
  EQL_ERROR_CODES.MISSING_DATA_SOURCE,
];

const isNonBlockingQueryBarErrorCode = (errorCode?: string) => {
  return !!NON_BLOCKING_QUERY_BAR_ERROR_CODES.find((code) => code === errorCode);
};

const NON_BLOCKING_ERROR_CODES = [...NON_BLOCKING_QUERY_BAR_ERROR_CODES];

const isNonBlockingErrorCode = (errorCode?: string) => {
  return !!NON_BLOCKING_ERROR_CODES.find((code) => code === errorCode);
};

const transformValidationError = ({
  errorCode,
  errorMessage,
}: {
  errorCode?: string;
  errorMessage: string;
}) => {
  if (isNonBlockingQueryBarErrorCode(errorCode)) {
    return i18n.QUERY_BAR_VALIDATION_ERROR(errorMessage);
  }
  return errorMessage;
};

export const useRuleFormsErrors = () => {
  const getRuleFormsErrors = useCallback(
    ({ defineStepForm, aboutStepForm, scheduleStepForm, actionsStepForm }: UseRuleFormsErrors) => {
      const blockingErrors: string[] = [];
      const nonBlockingErrors: string[] = [];

      for (const [_, fieldHook] of Object.entries(defineStepForm?.getFields() ?? {})) {
        fieldHook.errors.forEach((fieldError) => {
          const messages = getFieldErrorMessages(fieldError);
          if (isNonBlockingErrorCode(fieldError.code)) {
            nonBlockingErrors.push(
              ...messages.map((message) =>
                transformValidationError({ errorCode: fieldError.code, errorMessage: message })
              )
            );
          } else {
            blockingErrors.push(...messages);
          }
        });
      }

      const blockingForms = [aboutStepForm, scheduleStepForm, actionsStepForm];
      blockingForms.forEach((form) => {
        for (const [_, fieldHook] of Object.entries(form?.getFields() ?? {})) {
          blockingErrors.push(...fieldHook.errors.map((fieldError) => fieldError.message));
        }
      });
      return { blockingErrors, nonBlockingErrors };
    },
    []
  );

  return { getRuleFormsErrors };
};
