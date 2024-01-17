/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useMemo, useEffect } from 'react';
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
