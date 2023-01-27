/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiBasicTable, EuiBasicTableColumn, EuiCode, EuiFlexGroup, EuiText } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import {
  ContentFrom,
  ExtractionRuleFieldRule,
  FieldType,
  MultipleObjectsHandling,
} from '../../../../../../../../common/types/extraction_rules';

type FieldRuleWithId = ExtractionRuleFieldRule & { id: string };

export interface FieldRulesTableProps {
  editRule: (id: string) => void;
  fieldRules: FieldRuleWithId[];
  removeRule: (id: string) => void;
}

export const FieldRulesTable: React.FC<FieldRulesTableProps> = ({
  editRule,
  fieldRules,
  removeRule,
}) => {
  const columns: Array<EuiBasicTableColumn<FieldRuleWithId>> = [
    {
      field: 'field_name',
      name: i18n.translate(
        'xpack.enterpriseSearch.crawler.extractionRules.fieldRulesTable.fieldNameLabel',
        {
          defaultMessage: 'Field name',
        }
      ),
      textOnly: true,
    },
    {
      name: i18n.translate('xpack.enterpriseSearch.crawler.extractionRulesTable.sourceLabel', {
        defaultMessage: 'Source',
      }),
      render: (rule: FieldRuleWithId) => (
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiText size="s">
            {rule.source_type === FieldType.HTML
              ? i18n.translate('xpack.enterpriseSearch.crawler.fieldRulesTable.HTMLLabel', {
                  defaultMessage: 'HTML: ',
                })
              : i18n.translate('xpack.enterpriseSearch.crawler.fieldRulesTable.UrlLabel', {
                  defaultMessage: 'URL: ',
                })}
          </EuiText>
          <EuiCode>{rule.selector}</EuiCode>
        </EuiFlexGroup>
      ),
    },
    {
      name: i18n.translate('xpack.enterpriseSearch.crawler.fieldRulesTable.contentLabel', {
        defaultMessage: 'Content',
      }),
      render: ({
        content_from: content,
        multiple_objects_handling: multipleObjectsHandling,
      }: FieldRuleWithId) => (
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiText size="s">
            {content.value_type === ContentFrom.EXTRACTED
              ? i18n.translate('xpack.enterpriseSearch.crawler.fieldRulesTable.extractedLabel', {
                  defaultMessage: 'Extracted as: ',
                })
              : i18n.translate('xpack.enterpriseSearch.crawler.fieldRulesTable.fixedLabel', {
                  defaultMessage: 'Fixed value: ',
                })}
          </EuiText>
          <EuiCode>
            {content.value_type === ContentFrom.FIXED
              ? content.value
              : multipleObjectsHandling === MultipleObjectsHandling.ARRAY
              ? i18n.translate('xpack.enterpriseSearch.crawler.fieldRulesTable.arrayLabel', {
                  defaultMessage: 'array',
                })
              : i18n.translate('xpack.enterpriseSearch.crawler.fieldRulesTable.stringLabel', {
                  defaultMessage: 'string',
                })}
          </EuiCode>
        </EuiFlexGroup>
      ),
    },
    {
      actions: [
        {
          description: i18n.translate(
            'xpack.enterpriseSearch.content.crawler.extractionRules.fieldRulesTable.editRule.title',
            {
              defaultMessage: 'Edit this content field rule',
            }
          ),
          icon: 'pencil',
          isPrimary: false,
          name: i18n.translate(
            'xpack.enterpriseSearch.content.crawler.extractionRules.fieldRulesTable.editRule.caption',
            {
              defaultMessage: 'Edit this content field rule',
            }
          ),
          onClick: ({ id }) => editRule(id),
          type: 'icon',
        },
        {
          color: 'danger',
          description: i18n.translate(
            'xpack.enterpriseSearch.content.crawler.extractionRules.actions.deleteRule.title',
            {
              defaultMessage: 'Delete this extraction rule',
            }
          ),
          icon: 'trash',
          isPrimary: false,
          name: i18n.translate(
            'xpack.enterpriseSearch.content.crawler.extractionRules.actions.deleteRule.caption',
            {
              defaultMessage: 'Delete extraction rule',
            }
          ),
          onClick: ({ id }) => removeRule(id),
          type: 'icon',
        },
      ],
      name: i18n.translate('xpack.enterpriseSearch.content.crawler.extractionRules.actions.label', {
        defaultMessage: 'Actions',
      }),
    },
  ];

  return (
    <EuiBasicTable
      columns={columns}
      items={fieldRules}
      title={i18n.translate('xpack.enterpriseSearch.crawler.extractionRulesTable.title', {
        defaultMessage: 'Crawl rules',
      })}
    />
  );
};
