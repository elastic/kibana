/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import useToggle from 'react-use/lib/useToggle';
import { css } from '@emotion/css';
import { EuiButtonEmpty } from '@elastic/eui';
import { schema } from '../../../../../../../rule_creation_ui/components/step_define_rule/schema';
import { HiddenField, UseField } from '../../../../../../../../shared_imports';
import { QueryBarDefineRule } from '../../../../../../../rule_creation_ui/components/query_bar';
import * as stepDefineRuleI18n from '../../../../../../../rule_creation_ui/components/step_define_rule/translations';
import { useRuleIndexPattern } from '../../../../../../../rule_creation_ui/pages/form';
import { DataSourceType as DataSourceTypeSnakeCase } from '../../../../../../../../../common/api/detection_engine';
import type { DiffableRule } from '../../../../../../../../../common/api/detection_engine';
import { useDefaultIndexPattern } from '../../../../../../hooks/use_default_index_pattern';
import { DataSourceType } from '../../../../../../../../detections/pages/detection_engine/rules/types';
import type { SetRuleQuery } from '../../../../../../../../detections/containers/detection_engine/rules/use_rule_from_timeline';
import { useRuleFromTimeline } from '../../../../../../../../detections/containers/detection_engine/rules/use_rule_from_timeline';
import { useGetSavedQuery } from '../../../../../../../../detections/pages/detection_engine/rules/use_get_saved_query';
import type { RuleFieldEditComponentProps } from '../rule_field_edit_component_props';

export function KqlQueryEdit({
  finalDiffableRule,
  setFieldValue,
}: RuleFieldEditComponentProps): JSX.Element {
  const defaultIndexPattern = useDefaultIndexPattern();
  const indexPatternParameters = getRuleIndexPatternParameters(
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
          // queryBar's validation doesn't work until specified here.
          // ...schema.queryBar copies all configuration from the define rule form schema.
          ...schema.queryBar,
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

interface RuleIndexPatternParameters {
  dataSourceType: DataSourceType;
  index: string[];
  dataViewId: string | undefined;
}

function getRuleIndexPatternParameters(
  finalDiffableRule: DiffableRule,
  defaultIndexPattern: string[]
): RuleIndexPatternParameters {
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
