/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';

import { useValues, useActions } from 'kea';

import { EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';

import { DELETE_BUTTON_LABEL } from '../../../../shared/constants';
import { AppSearchPageTemplate } from '../../layout';
import { DELETE_CONFIRMATION_MESSAGE, MANAGE_CURATION_TITLE } from '../constants';
import { getCurationsBreadcrumbs } from '../utils';

import { PROMOTED_DOCUMENTS_TITLE, HIDDEN_DOCUMENTS_TITLE } from './constants';
import { CurationLogic } from './curation_logic';
import { PromotedDocuments, OrganicDocuments, HiddenDocuments } from './documents';
import { ActiveQuerySelect, ManageQueriesModal } from './queries';
import { AddResultLogic, AddResultFlyout } from './results';
import { SuggestedDocumentsCallout } from './suggested_documents_callout';

export const ManualCuration: React.FC = () => {
  const { curationId } = useParams() as { curationId: string };
  const { onSelectPageTab, deleteCuration } = useActions(CurationLogic({ curationId }));
  const { dataLoading, queries, selectedPageTab } = useValues(CurationLogic({ curationId }));
  const { isFlyoutOpen } = useValues(AddResultLogic);

  const pageTabs = [
    {
      label: PROMOTED_DOCUMENTS_TITLE,
      isSelected: selectedPageTab === 'promoted',
      onClick: () => onSelectPageTab('promoted'),
    },
    {
      label: HIDDEN_DOCUMENTS_TITLE,
      isSelected: selectedPageTab === 'hidden',
      onClick: () => onSelectPageTab('hidden'),
    },
  ];

  return (
    <AppSearchPageTemplate
      pageChrome={getCurationsBreadcrumbs([queries.join(', ')])}
      pageHeader={{
        pageTitle: MANAGE_CURATION_TITLE,
        rightSideItems: [
          <EuiFlexGroup gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButton
                color="danger"
                iconType="trash"
                onClick={() => {
                  if (window.confirm(DELETE_CONFIRMATION_MESSAGE)) deleteCuration();
                }}
              >
                {DELETE_BUTTON_LABEL}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <ManageQueriesModal />
            </EuiFlexItem>
          </EuiFlexGroup>,
        ],
        tabs: pageTabs,
      }}
      isLoading={dataLoading}
    >
      <ActiveQuerySelect />
      {selectedPageTab === 'promoted' && <SuggestedDocumentsCallout />}
      {selectedPageTab === 'promoted' && <PromotedDocuments />}
      {selectedPageTab === 'hidden' && <HiddenDocuments />}
      <OrganicDocuments />

      {isFlyoutOpen && <AddResultFlyout />}
    </AppSearchPageTemplate>
  );
};
