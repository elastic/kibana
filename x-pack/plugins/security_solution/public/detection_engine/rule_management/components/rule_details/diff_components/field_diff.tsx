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

export interface FieldDiffComponentProps {
  ruleDiffs: Array<{ currentVersion: string; targetVersion: string; fieldName: string }>;
  fieldName: string;
}

const sortAndStringifyJson = (jsObject: unknown): string => {
  if (typeof jsObject === 'string') {
    return jsObject;
  }
  return stringify(jsObject, { space: 2 });
};

export const FieldDiffComponent = ({ ruleDiffs, fieldName }: FieldDiffComponentProps) => {
  console.log('here: ', ruleDiffs);
  return (
    <RuleDiffPanelWrapper fieldName={fieldName}>
      {ruleDiffs.length === 1 ? (
        <EuiFlexGroup justifyContent="spaceBetween">
          <DiffView
            oldSource={sortAndStringifyJson(ruleDiffs[0].currentVersion)}
            newSource={sortAndStringifyJson(ruleDiffs[0].targetVersion)}
            diffMethod={DiffMethod.WORDS}
          />
        </EuiFlexGroup>
      ) : (
        ruleDiffs.map(({ currentVersion, targetVersion, fieldName: specificFieldName }) => {
          const formattedCurrentVersion = sortAndStringifyJson(currentVersion);
          const formattedTargetVersion = sortAndStringifyJson(targetVersion);
          return (
            <EuiFlexGroup key={specificFieldName} justifyContent="spaceBetween">
              {formattedCurrentVersion !== formattedTargetVersion ? (
                <EuiFlexGroup direction="column">
                  <EuiTitle size="xxxs">
                    <h4>{startCase(camelCase(specificFieldName))}</h4>
                  </EuiTitle>
                  <DiffView
                    oldSource={formattedCurrentVersion}
                    newSource={formattedTargetVersion}
                    diffMethod={DiffMethod.WORDS}
                  />
                  <EuiHorizontalRule margin="s" size="full" />
                </EuiFlexGroup>
              ) : null}
            </EuiFlexGroup>
          );
        })
      )}
    </RuleDiffPanelWrapper>
  );
};
