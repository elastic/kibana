/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiAccordion, EuiSpacer, EuiTitle } from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/css';
import type { FieldsGroupDiff } from '../../../model/rule_details/rule_field_diff';
import { FieldGroupDiffComponent } from './field_diff';

interface RuleDiffSectionProps {
  title: string;
  fieldGroups: FieldsGroupDiff[];
}

export const RuleDiffSection = ({ title, fieldGroups }: RuleDiffSectionProps) => (
  <>
    <EuiSpacer size="m" />
    <EuiAccordion
      initialIsOpen={true}
      id={title}
      css={css`
        padding-top: 1px; // Fixes border disappearing bug
      `}
      buttonContent={
        <EuiTitle size="s">
          <h3>{title}</h3>
        </EuiTitle>
      }
    >
      {fieldGroups.map(({ fieldsGroupName, formattedDiffs }) => {
        return (
          <React.Fragment key={fieldsGroupName}>
            <EuiSpacer size="m" />
            <FieldGroupDiffComponent ruleDiffs={formattedDiffs} fieldsGroupName={fieldsGroupName} />
          </React.Fragment>
        );
      })}
    </EuiAccordion>
  </>
);
