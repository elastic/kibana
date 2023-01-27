/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiButton, EuiConfirmModal, EuiEmptyPrompt, EuiText } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { EditExtractionRule } from './edit_extraction_rule';
import { ExtractionRulesLogic } from './extraction_rules_logic';
import { ExtractionRulesTable } from './extraction_rules_table';

export const ExtractionRules: React.FC = () => {
  const {
    cancelEditExtractionRule,
    deleteExtractionRule,
    editNewExtractionRule,
    hideDeleteModal,
    saveExtractionRule,
  } = useActions(ExtractionRulesLogic);
  const {
    deleteModalVisible,
    editingExtractionRule,
    extractionRules,
    extractionRuleToDelete,
    extractionRuleToEdit,
    extractionRuleToEditIsNew,
  } = useValues(ExtractionRulesLogic);

  return (
    <>
      {deleteModalVisible && (
        <EuiConfirmModal
          maxWidth
          buttonColor="danger"
          onCancel={hideDeleteModal}
          onConfirm={deleteExtractionRule}
          confirmButtonText={i18n.translate(
            'xpack.enterpriseSearch.content.crawler.extractionRules.deleteModal.confirmLabel',
            {
              defaultMessage: 'Delete rule',
            }
          )}
          title={i18n.translate(
            'xpack.enterpriseSearch.content.crawler.extractionRules.deleteModal.title',
            {
              defaultMessage: 'Are you sure you want to delete this extraction rule?',
            }
          )}
          cancelButtonText={i18n.translate(
            'xpack.enterpriseSearch.content.crawler.extractionRules.deleteModal.cancelLabel',
            {
              defaultMessage: 'Cancel',
            }
          )}
        >
          {i18n.translate(
            'xpack.enterpriseSearch.content.crawler.extractionRules.deleteModal.description',
            {
              defaultMessage:
                'Removing this rule will also delete {fields, plural, one {one field rule} other {# field rules}}. This action cannot be undone.',
              values: { fields: extractionRuleToDelete?.rules.length ?? 0 },
            }
          )}
        </EuiConfirmModal>
      )}
      {editingExtractionRule ? (
        <EditExtractionRule
          cancelEditing={cancelEditExtractionRule}
          extractionRule={extractionRuleToEdit}
          isNewRule={extractionRuleToEditIsNew}
          saveRule={saveExtractionRule}
        />
      ) : extractionRules.length === 0 ? (
        <EuiEmptyPrompt
          title={
            <h4>
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.crawler.extractionRulesTable.emptyMessageTitle',
                {
                  defaultMessage: 'There are no content extraction rules',
                }
              )}
            </h4>
          }
          titleSize="s"
          body={
            <EuiText>
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.crawler.extractionRulesTable.emptyMessageDescription',
                {
                  defaultMessage:
                    'Create a content extraction rule to change where document fields get their data during a sync.',
                }
              )}
            </EuiText>
          }
          actions={
            <EuiButton
              data-telemetry-id="entSearchContent-crawler-domainDetail-extractionRules-addContentExtractionRule"
              iconType="plusInCircle"
              onClick={editNewExtractionRule}
            >
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.crawler.extractionRulesTable.emptyMessageAddRuleLabel',
                {
                  defaultMessage: 'Add content extraction rule',
                }
              )}
            </EuiButton>
          }
        />
      ) : (
        <ExtractionRulesTable />
      )}
    </>
  );
};
