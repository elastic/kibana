/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { useToggle } from 'react-use';
import { css } from '@emotion/css';
import { EuiButtonEmpty } from '@elastic/eui';
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import type { FormSchema, FormData } from '../../../../../../../shared_imports';
import { HiddenField, UseField } from '../../../../../../../shared_imports';
import { schema } from '../../../../../../rule_creation_ui/components/step_define_rule/schema';
import { QueryBarDefineRule } from '../../../../../../rule_creation_ui/components/query_bar';
import type { FieldValueQueryBar } from '../../../../../../rule_creation_ui/components/query_bar';
import * as stepDefineRuleI18n from '../../../../../../rule_creation_ui/components/step_define_rule/translations';
import { useRuleIndexPattern } from '../../../../../../rule_creation_ui/pages/form';
import {
  DataSourceType as DataSourceTypeSnakeCase,
  KqlQueryLanguage,
  KqlQueryType,
  RuleQuery,
  SavedQueryId,
  RuleKqlQuery,
} from '../../../../../../../../common/api/detection_engine';
import type {
  DiffableRule,
  DiffableRuleTypes,
  InlineKqlQuery,
  SavedKqlQuery,
} from '../../../../../../../../common/api/detection_engine';
import { useDefaultIndexPattern } from '../../../use_default_index_pattern';
import { DataSourceType } from '../../../../../../../detections/pages/detection_engine/rules/types';
import { isFilters } from '../../../helpers';
import type { SetRuleQuery } from '../../../../../../../detections/containers/detection_engine/rules/use_rule_from_timeline';
import { useRuleFromTimeline } from '../../../../../../../detections/containers/detection_engine/rules/use_rule_from_timeline';
import { useGetSavedQuery } from '../../../../../../../detections/pages/detection_engine/rules/use_get_saved_query';

export const kqlQuerySchema = {
  ruleType: schema.ruleType,
  queryBar: schema.queryBar,
} as FormSchema<{
  ruleType: DiffableRuleTypes;
  queryBar: FieldValueQueryBar;
}>;

interface KqlQueryEditProps {
  finalDiffableRule: DiffableRule;
  setValidity: (isValid: boolean) => void;
  setFieldValue: (fieldName: string, fieldValue: unknown) => void;
}

export function KqlQueryEdit({
  finalDiffableRule,
  setValidity,
  setFieldValue,
}: KqlQueryEditProps): JSX.Element {
  const defaultIndexPattern = useDefaultIndexPattern();
  const indexPatternParameters = getUseRuleIndexPatternParameters(
    finalDiffableRule,
    defaultIndexPattern
  );
  const { indexPattern, isIndexPatternLoading } = useRuleIndexPattern(indexPatternParameters);

  const [isTimelineSearchOpen, toggleIsTimelineSearchOpen] = useToggle(false);

  const handleSetRuleFromTimeline = useCallback<SetRuleQuery>(
    ({ queryBar: timelineQueryBar }) => {
      setFieldValue('queryBar', timelineQueryBar);
    },
    [setFieldValue]
  );

  const { onOpenTimeline } = useRuleFromTimeline(handleSetRuleFromTimeline);

  const isSavedQueryRule = finalDiffableRule.type === 'saved_query';

  const { savedQuery } = useGetSavedQuery({
    savedQueryId: getSavedQueryId(finalDiffableRule),
    ruleType: finalDiffableRule.type,
  });

  return (
    <>
      <UseField path="ruleType" component={HiddenField} />
      <UseField
        path="queryBar"
        config={{
          ...kqlQuerySchema.queryBar,
          label: stepDefineRuleI18n.QUERY_BAR_LABEL,
          labelAppend: isSavedQueryRule ? null : (
            <ImportTimelineQueryButton handleOpenTimelineSearch={toggleIsTimelineSearchOpen} />
          ),
        }}
        component={QueryBarDefineRule}
        componentProps={{
          indexPattern,
          isLoading: isIndexPatternLoading,
          openTimelineSearch: isTimelineSearchOpen,
          onCloseTimelineSearch: toggleIsTimelineSearchOpen,
          onValidityChange: setValidity,
          onOpenTimeline,
          isDisabled: isSavedQueryRule,
          defaultSavedQuery: savedQuery,
          resetToSavedQuery: isSavedQueryRule,
        }}
      />
    </>
  );
}

const timelineButtonClassName = css`
  height: 18px;
  font-size: 12px;
`;

function ImportTimelineQueryButton({
  handleOpenTimelineSearch,
}: {
  handleOpenTimelineSearch: () => void;
}) {
  return (
    <EuiButtonEmpty className={timelineButtonClassName} onClick={handleOpenTimelineSearch}>
      {stepDefineRuleI18n.IMPORT_TIMELINE_QUERY}
    </EuiButtonEmpty>
  );
}

export function kqlQuerySerializer(formData: FormData): {
  kql_query: RuleKqlQuery;
} {
  const formValue = formData as { ruleType: Type; queryBar: FieldValueQueryBar };

  if (formValue.ruleType === 'saved_query') {
    const savedQueryId = SavedQueryId.parse(formValue.queryBar.saved_id);

    const savedKqlQuery: SavedKqlQuery = {
      type: KqlQueryType.saved_query,
      saved_query_id: savedQueryId,
    };

    return {
      kql_query: savedKqlQuery,
    };
  }

  const query = RuleQuery.parse(formValue.queryBar.query.query);
  const language = KqlQueryLanguage.parse(formValue.queryBar.query.language);

  const inlineKqlQuery: InlineKqlQuery = {
    type: KqlQueryType.inline_query,
    query,
    language,
    filters: formValue.queryBar.filters,
  };

  return { kql_query: inlineKqlQuery };
}

export function kqlQueryDeserializer(
  fieldValue: FormData,
  finalDiffableRule: DiffableRule
): {
  ruleType: Type;
  queryBar: FieldValueQueryBar;
} {
  const parsedFieldValue = RuleKqlQuery.parse(fieldValue);

  if (parsedFieldValue.type === KqlQueryType.inline_query) {
    const returnValue = {
      ruleType: finalDiffableRule.type,
      queryBar: {
        query: {
          query: parsedFieldValue.query,
          language: parsedFieldValue.language,
        },
        filters: isFilters(parsedFieldValue.filters) ? parsedFieldValue.filters : [],
        saved_id: null,
      },
    };

    return returnValue;
  }

  const returnValue = {
    ruleType: finalDiffableRule.type,
    queryBar: {
      query: {
        query: '',
        language: '',
      },
      filters: [],
      saved_id: parsedFieldValue.saved_query_id,
    },
  };

  return returnValue;
}

interface UseRuleIndexPatternParameters {
  dataSourceType: DataSourceType;
  index: string[];
  dataViewId: string | undefined;
}

function getUseRuleIndexPatternParameters(
  finalDiffableRule: DiffableRule,
  defaultIndexPattern: string[]
): UseRuleIndexPatternParameters {
  if (!('data_source' in finalDiffableRule) || !finalDiffableRule.data_source) {
    return {
      dataSourceType: DataSourceType.IndexPatterns,
      index: defaultIndexPattern,
      dataViewId: undefined,
    };
  }
  if (finalDiffableRule.data_source.type === DataSourceTypeSnakeCase.data_view) {
    return {
      dataSourceType: DataSourceType.DataView,
      index: [],
      dataViewId: finalDiffableRule.data_source.data_view_id,
    };
  }
  return {
    dataSourceType: DataSourceType.IndexPatterns,
    index: finalDiffableRule.data_source.index_patterns,
    dataViewId: undefined,
  };
}

function getSavedQueryId(diffableRule: DiffableRule): string | undefined {
  if (diffableRule.type === 'saved_query' && 'saved_query_id' in diffableRule.kql_query) {
    return diffableRule.kql_query.saved_query_id;
  }

  return undefined;
}
