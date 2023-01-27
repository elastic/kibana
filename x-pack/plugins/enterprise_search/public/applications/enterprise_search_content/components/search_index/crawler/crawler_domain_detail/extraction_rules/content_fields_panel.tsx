/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiEmptyPrompt,
  EuiText,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { ExtractionRuleFieldRule } from '../../../../../../../../common/types/extraction_rules';

import { FieldRulesTable } from './field_rules_table';

interface ContentFieldsPanelProps {
  contentFields: Array<ExtractionRuleFieldRule & { id: string }>;
  editNewField: () => void;
  editExistingField: (id: string) => void;
  removeField: (id: string) => void;
}

export const ContentFieldsPanel: React.FC<ContentFieldsPanelProps> = ({
  contentFields,
  editNewField,
  editExistingField,
  removeField,
}) => {
  return contentFields.length === 0 ? (
    <EuiEmptyPrompt
      title={
        <h4>
          {i18n.translate(
            'xpack.enterpriseSearch.content.indices.extractionRules.editRule.fieldRules.emptyMessageTitle',
            {
              defaultMessage: 'This extraction rule has no content fields',
            }
          )}
        </h4>
      }
      titleSize="s"
      body={
        <EuiText>
          {i18n.translate(
            'xpack.enterpriseSearch.content.indices.extractionRules.editRule.fieldRules.emptyMessageDescription',
            {
              defaultMessage:
                'Create a content field to pinpoint which parts of a webpage to pull data from.',
            }
          )}
        </EuiText>
      }
      actions={
        <EuiButton iconType="plusInCircle" onClick={editNewField}>
          {i18n.translate(
            'xpack.enterpriseSearch.content.indices.extractionRules.editRule.fieldRules.emptyMessageAddRuleLabel',
            {
              defaultMessage: 'Add content fields',
            }
          )}
        </EuiButton>
      }
    />
  ) : (
    <>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem>
          <EuiText size="s">
            <p>
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.extractionRules.editRule.fieldRules.contentFieldDescription',
                {
                  defaultMessage:
                    'Create a content field to pinpoint which parts of a webpage to pull data from.',
                }
              )}
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton iconType="plusInCircle" onClick={editNewField}>
            {i18n.translate(
              'xpack.enterpriseSearch.content.indices.extractionRules.editRule.fieldRules.addContentFieldRuleLabel',
              {
                defaultMessage: 'Add content field rule',
              }
            )}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <FieldRulesTable
        editRule={editExistingField}
        fieldRules={contentFields}
        removeRule={removeField}
      />
    </>
  );
};
