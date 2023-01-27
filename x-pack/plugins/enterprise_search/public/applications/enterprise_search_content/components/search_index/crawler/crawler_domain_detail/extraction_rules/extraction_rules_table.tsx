/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiCode,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedRelative } from '@kbn/i18n-react';

import { ExtractionRule } from '../../../../../../../../common/types/extraction_rules';

import { ContentFieldsPanel } from './content_fields_panel';
import { ExtractionRulesLogic } from './extraction_rules_logic';

export const ExtractionRulesTable: React.FC = () => {
  const {
    deleteFieldRule,
    editExtractionRule,
    hideDeleteFieldModal,
    openEditRuleFlyout,
    showDeleteFieldModal,
    showDeleteModal,
  } = useActions(ExtractionRulesLogic);

  const { deleteFieldModalVisible, extractionRules } = useValues(ExtractionRulesLogic);

  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<
    Record<string, React.ReactNode>
  >({});

  useEffect(() => {
    setItemIdToExpandedRowMap({});
  }, [extractionRules]);

  const toggleExpandedItem = (item: ExtractionRule) => {
    if (itemIdToExpandedRowMap[item.id]) {
      // omit item from rowmap
      const { [item.id]: _, ...rest } = itemIdToExpandedRowMap;
      setItemIdToExpandedRowMap(rest);
    } else {
      const rules = item.rules.map((val, index) => ({ ...val, id: `${index}`, index }));
      const newItem = (
        <EuiPanel color="subdued">
          <ContentFieldsPanel
            contentFields={rules}
            editExistingField={(id) => {
              editExtractionRule(item);
              const rule = rules.find(({ id: ruleId }) => id === ruleId);
              if (rule) {
                openEditRuleFlyout({
                  fieldRule: rule,
                  fieldRuleIndex: rule.index,
                  isNewRule: false,
                });
              }
            }}
            editNewField={() => {
              editExtractionRule(item);
              openEditRuleFlyout({ isNewRule: true });
            }}
            removeField={(id) => {
              const rule = rules.find(({ id: ruleId }) => id === ruleId);
              if (rule) {
                showDeleteFieldModal({ extractionRuleId: item.id, fieldRuleIndex: rule.index });
              }
            }}
          />
        </EuiPanel>
      );
      setItemIdToExpandedRowMap({ ...itemIdToExpandedRowMap, [item.id]: newItem });
    }
  };

  const columns: Array<EuiBasicTableColumn<ExtractionRule>> = [
    {
      field: 'description',
      name: i18n.translate(
        'xpack.enterpriseSearch.crawler.extractionRulesTable.descriptionTableLabel',
        {
          defaultMessage: 'Description',
        }
      ),
      textOnly: true,
    },
    {
      field: 'url_filters',
      name: i18n.translate('xpack.enterpriseSearch.crawler.extractionRulesTable.urlsLabel', {
        defaultMessage: 'URLs',
      }),
      render: (filters: ExtractionRule['url_filters']) => (
        <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="xs">
          {filters.length > 0
            ? filters.map(({ pattern }, index) => (
                <EuiFlexItem key={`${index}`}>
                  <EuiCode>{pattern}</EuiCode>
                </EuiFlexItem>
              ))
            : ''}
        </EuiFlexGroup>
      ),
    },
    {
      field: 'rules',
      name: i18n.translate('xpack.enterpriseSearch.crawler.extractionRulesTable.rulesLabel', {
        defaultMessage: 'Field rules',
      }),
      render: (rules: ExtractionRule['rules']) => rules.length,
      textOnly: true,
    },
    {
      field: 'updated_at',
      name: i18n.translate('xpack.enterpriseSearch.crawler.extractionRulesTable.lastUpdatedLabel', {
        defaultMessage: 'Last updated',
      }),
      render: (lastUpdated: string) => <FormattedRelative value={lastUpdated} />,
      textOnly: true,
    },
    {
      field: 'edited_by',
      name: i18n.translate('xpack.enterpriseSearch.crawler.extractionRulesTable.editedByLabel', {
        defaultMessage: 'Edited by',
      }),
      render: (editedBy: string) => editedBy,
      textOnly: true,
    },
    {
      actions: [
        {
          description: i18n.translate(
            'xpack.enterpriseSearch.content.crawler.extractionRules.actions.editRule.title',
            {
              defaultMessage: 'Edit this extraction rule',
            }
          ),
          icon: 'pencil',
          isPrimary: false,
          name: i18n.translate(
            'xpack.enterpriseSearch.content.crawler.extractionRules.actions.editRule.caption',
            {
              defaultMessage: 'Edit this extraction rule',
            }
          ),
          onClick: (extractionRule) => editExtractionRule(extractionRule),
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
          onClick: (extractionRule) => showDeleteModal(extractionRule),
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
          icon: (item) => (!!itemIdToExpandedRowMap[item.id] ? 'arrowUp' : 'arrowDown'),
          isPrimary: true,
          name: i18n.translate(
            'xpack.enterpriseSearch.content.crawler.extractionRules.actions.expandRule.caption',
            {
              defaultMessage: 'Expand rule',
            }
          ),
          onClick: (extractionRule) => toggleExpandedItem(extractionRule),
          type: 'icon',
        },
      ],
      name: i18n.translate('xpack.enterpriseSearch.content.crawler.extractionRules.actions.label', {
        defaultMessage: 'Actions',
      }),
    },
  ];

  return (
    <>
      {deleteFieldModalVisible && (
        <EuiConfirmModal
          maxWidth
          buttonColor="danger"
          onCancel={hideDeleteFieldModal}
          onConfirm={deleteFieldRule}
          confirmButtonText={i18n.translate(
            'xpack.enterpriseSearch.content.crawler.extractionRules.deleteFieldModal.confirmLabel',
            {
              defaultMessage: 'Delete rule',
            }
          )}
          title={i18n.translate(
            'xpack.enterpriseSearch.content.crawler.extractionRules.deleteFieldModal.title',
            {
              defaultMessage: 'Are you sure you want to delete this field rule?',
            }
          )}
          cancelButtonText={i18n.translate(
            'xpack.enterpriseSearch.content.crawler.extractionRules.deleteFieldModal.cancelLabel',
            {
              defaultMessage: 'Cancel',
            }
          )}
        >
          {i18n.translate(
            'xpack.enterpriseSearch.content.crawler.extractionRules.deleteFieldModal.description',
            {
              defaultMessage: 'This action cannot be undone.',
            }
          )}
        </EuiConfirmModal>
      )}
      <EuiBasicTable
        columns={columns}
        isExpandable
        itemId="id"
        itemIdToExpandedRowMap={itemIdToExpandedRowMap}
        items={extractionRules}
        title={i18n.translate('xpack.enterpriseSearch.crawler.extractionRulesTable.title', {
          defaultMessage: 'Crawl rules',
        })}
      />
    </>
  );
};
