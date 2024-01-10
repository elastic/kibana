/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import type { FullRuleDiff, RuleFieldsDiff } from '../../../../../common/api/detection_engine';
import { PartialRuleDiff, DiffableCommonFields } from '../../../../../common/api/detection_engine';
import type { RuleResponse } from '../../../../../common/api/detection_engine/model/rule_schema/rule_schemas.gen';
import { DiffView } from './json_diff/diff_view';
import * as i18n from './json_diff/translations';
import { FieldDiffComponent } from './diff_components';
import { getFormattedFieldDiff } from '../../logic/rule_details/get_formatted_field_diff';

interface PerFieldRuleDiffTabProps {
  ruleDiff: FullRuleDiff;
}

export const PerFieldRuleDiffTab = ({ ruleDiff }: PerFieldRuleDiffTabProps) => {
  console.log(ruleDiff);

  const fieldsToRender = useMemo(() => {
    const fields: Array<{
      formattedDiffs: Array<{ currentVersion: string; targetVersion: string; fieldName: string }>;
      fieldName: string;
    }> = [];
    for (const field in ruleDiff.fields) {
      if (Object.hasOwn(ruleDiff.fields, field)) {
        const typedField = field as keyof RuleFieldsDiff;
        const formattedDiffs = getFormattedFieldDiff(typedField, ruleDiff.fields);
        // const oldField = sortAndStringifyJson(ruleDiff.fields[typedField].current_version);
        // const newField = sortAndStringifyJson(ruleDiff.fields[typedField].target_version);
        fields.push({ formattedDiffs, fieldName: field });
      }
    }
    return fields;
  }, [ruleDiff.fields]);

  return (
    <>
      {fieldsToRender.map(({ fieldName, formattedDiffs }) => {
        return (
          <>
            <EuiSpacer size="m" />
            <FieldDiffComponent ruleDiffs={formattedDiffs} fieldName={fieldName} />
          </>
        );
      })}
    </>
  );
};
