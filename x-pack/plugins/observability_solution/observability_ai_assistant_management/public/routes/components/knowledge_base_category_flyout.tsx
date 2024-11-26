/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { capitalize } from 'lodash';
import type { KnowledgeBaseEntry } from '@kbn/observability-ai-assistant-plugin/common/types';
import moment from 'moment';
import { useDeleteKnowledgeBaseEntry } from '../../hooks/use_delete_knowledge_base_entry';
import { KnowledgeBaseEntryCategory } from '../../helpers/categorize_entries';
import { useKibana } from '../../hooks/use_kibana';

const CATEGORY_MAP = {
  lens: {
    description: (
      <>
        <EuiText size="m">
          {i18n.translate(
            'xpack.observabilityAiAssistantManagement.knowledgeBaseCategoryFlyout.categoryMap.lensCategoryDescriptionLabel',
            {
              defaultMessage:
                'Lens is a Kibana feature which allows the Assistant to visualize data in response to user queries. These Knowledge base items are loaded into the Knowledge base by default.',
            }
          )}
        </EuiText>
      </>
    ),
  },
};

export function KnowledgeBaseCategoryFlyout({
  category,
  onClose,
}: {
  category: KnowledgeBaseEntryCategory;
  onClose: () => void;
}) {
  const { uiSettings } = useKibana().services;
  const dateFormat = uiSettings.get('dateFormat');

  const { mutate: deleteEntry } = useDeleteKnowledgeBaseEntry();

  const columns: Array<EuiBasicTableColumn<KnowledgeBaseEntry>> = [
    {
      field: '@timestamp',
      name: i18n.translate(
        'xpack.observabilityAiAssistantManagement.knowledgeBaseCategoryFlyout.actions.dateCreated',
        {
          defaultMessage: 'Date created',
        }
      ),
      sortable: true,
      render: (timestamp: KnowledgeBaseEntry['@timestamp']) => (
        <EuiBadge color="hollow">{moment(timestamp).format(dateFormat)}</EuiBadge>
      ),
    },
    {
      field: 'id',
      name: i18n.translate(
        'xpack.observabilityAiAssistantManagement.knowledgeBaseCategoryFlyout.actions.name',
        {
          defaultMessage: 'Name',
        }
      ),
      sortable: true,
      width: '340px',
    },
    {
      name: 'Actions',
      actions: [
        {
          name: i18n.translate(
            'xpack.observabilityAiAssistantManagement.knowledgeBaseCategoryFlyout.actions.delete',
            {
              defaultMessage: 'Delete',
            }
          ),
          description: i18n.translate(
            'xpack.observabilityAiAssistantManagement.knowledgeBaseCategoryFlyout.actions.deleteDescription',
            { defaultMessage: 'Delete this entry' }
          ),
          type: 'icon',
          icon: 'trash',
          onClick: ({ id }) => {
            deleteEntry({ id });
          },
        },
      ],
    },
  ];

  const hasDescription =
    CATEGORY_MAP[category.categoryKey as unknown as keyof typeof CATEGORY_MAP]?.description;

  return (
    <EuiFlyout onClose={onClose} data-test-subj="knowledgeBaseCategoryFlyout">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2>{capitalize(category.categoryKey)}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {hasDescription ? (
          hasDescription
        ) : (
          <EuiBasicTable<KnowledgeBaseEntry> columns={columns} items={category.entries ?? []} />
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
