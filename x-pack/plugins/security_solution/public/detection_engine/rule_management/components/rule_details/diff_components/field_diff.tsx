/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import stringify from 'json-stable-stringify';
import { EuiFlexGroup, EuiHorizontalRule, EuiTitle } from '@elastic/eui';
import { camelCase, startCase } from 'lodash';
import React from 'react';
import { DiffView } from '../json_diff/diff_view';
import { DiffMethod } from '../json_diff/mark_edits';
import { RuleDiffPanelWrapper } from './panel_wrapper';
import type { FormattedFieldDiff } from '../../../model/rule_details/rule_field_diff';
import { fieldToDisplayNameMap } from './translations';

export interface FieldDiffComponentProps {
  ruleDiffs: FormattedFieldDiff[];
  fieldName: string;
}

const sortAndStringifyJson = (jsObject: unknown): string => {
  if (typeof jsObject === 'string') {
    return jsObject;
  }
  return stringify(jsObject, { space: 2 });
};

export const FieldDiffComponent = ({ ruleDiffs, fieldName }: FieldDiffComponentProps) => {
  return (
    <RuleDiffPanelWrapper fieldName={fieldName}>
      {ruleDiffs.map(({ currentVersion, targetVersion, fieldName: specificFieldName }) => {
        const shouldShowSubtitles = ruleDiffs.length > 1;
        const formattedCurrentVersion = sortAndStringifyJson(currentVersion);
        const formattedTargetVersion = sortAndStringifyJson(targetVersion);
        if (formattedCurrentVersion === formattedTargetVersion) {
          return null;
        }
        return (
          <EuiFlexGroup key={specificFieldName} justifyContent="spaceBetween">
            <EuiFlexGroup direction="column">
              {shouldShowSubtitles ? (
                <EuiTitle size="xxxs">
                  <h4>
                    {fieldToDisplayNameMap[specificFieldName] ??
                      startCase(camelCase(specificFieldName))}
                  </h4>
                </EuiTitle>
              ) : null}
              <DiffView
                oldSource={formattedCurrentVersion}
                newSource={formattedTargetVersion}
                diffMethod={DiffMethod.WORDS}
              />
              {shouldShowSubtitles ? <EuiHorizontalRule margin="s" size="full" /> : null}
            </EuiFlexGroup>
          </EuiFlexGroup>
        );
      })}
    </RuleDiffPanelWrapper>
  );
};
