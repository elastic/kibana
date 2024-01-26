/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { PartialRuleDiff, RuleFieldsDiff } from '../../../../../common/api/detection_engine';
import { getFormattedFieldDiff } from '../../logic/rule_details/get_formatted_field_diff';
import { UPGRADE_FIELD_ORDER } from './constants';
import { RuleDiffHeaderBar, RuleDiffSection } from './diff_components';
import { getSectionedFieldDiffs } from './helpers';
import type { RuleFieldDiff } from '../../model/rule_details/rule_field_diff';

interface PerFieldRuleDiffTabProps {
  ruleDiff: PartialRuleDiff;
}

export const PerFieldRuleDiffTab = ({ ruleDiff }: PerFieldRuleDiffTabProps) => {
  console.log(ruleDiff);

  const fieldsToRender = useMemo(() => {
    const fields: RuleFieldDiff[] = [];
    for (const field in ruleDiff.fields) {
      if (Object.hasOwn(ruleDiff.fields, field)) {
        const typedField = field as keyof RuleFieldsDiff;
        const formattedDiffs = getFormattedFieldDiff(typedField, ruleDiff.fields);
        fields.push({ formattedDiffs, fieldName: typedField });
      }
    }
    const sortedFields = fields.sort(
      (a, b) => UPGRADE_FIELD_ORDER.indexOf(a.fieldName) - UPGRADE_FIELD_ORDER.indexOf(b.fieldName)
    );
    return sortedFields;
  }, [ruleDiff.fields]);

  const { aboutFields, definitionFields, scheduleFields, setupFields } = useMemo(
    () => getSectionedFieldDiffs(fieldsToRender),
    [fieldsToRender]
  );

  return (
    <>
      <RuleDiffHeaderBar />
      {aboutFields.length !== 0 && <RuleDiffSection title={'About'} fields={aboutFields} />}
      {definitionFields.length !== 0 && (
        <RuleDiffSection title={'Description'} fields={definitionFields} />
      )}
      {scheduleFields.length !== 0 && (
        <RuleDiffSection title={'Schedule'} fields={scheduleFields} />
      )}
      {setupFields.length !== 0 && <RuleDiffSection title={'Setup'} fields={setupFields} />}
    </>
  );
};
