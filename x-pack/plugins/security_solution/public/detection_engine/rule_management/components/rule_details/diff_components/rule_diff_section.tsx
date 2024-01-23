/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiAccordion, EuiSpacer, EuiTitle } from '@elastic/eui';
import React from 'react';
import type { RuleFieldDiff } from '../../../model/rule_details/rule_field_diff';
import { FieldDiffComponent } from './field_diff';

interface RuleDiffSectionProps {
  title: string;
  fields: RuleFieldDiff[];
}

export const RuleDiffSection = ({ title, fields }: RuleDiffSectionProps) => (
  <>
    <EuiSpacer size="m" />
    <EuiAccordion
      initialIsOpen={true}
      id={title}
      buttonContent={
        <EuiTitle size="s">
          <h3>{title}</h3>
        </EuiTitle>
      }
    >
      {fields.map(({ fieldName, formattedDiffs }) => {
        return (
          <>
            <EuiSpacer size="m" />
            <FieldDiffComponent ruleDiffs={formattedDiffs} fieldName={fieldName} />
          </>
        );
      })}
    </EuiAccordion>
  </>
);
