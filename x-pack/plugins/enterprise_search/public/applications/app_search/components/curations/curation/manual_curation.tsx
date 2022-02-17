/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';

import { useValues, useActions } from 'kea';

import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { AppSearchPageTemplate } from '../../layout';
import { MANAGE_CURATION_TITLE } from '../constants';
import { getCurationsBreadcrumbs } from '../utils';

import { PROMOTED_DOCUMENTS_TITLE, HIDDEN_DOCUMENTS_TITLE } from './constants';
import { CurationLogic } from './curation_logic';
import { DeleteCurationButton } from './delete_curation_button';
import { PromotedDocuments, OrganicDocuments, HiddenDocuments } from './documents';
import { ActiveQuerySelect, ManageQueriesModal } from './queries';
import { AddResultLogic, AddResultFlyout } from './results';
import { SuggestedDocumentsCallout } from './suggested_documents_callout';

export const ManualCuration: React.FC = () => {
  const { curationId } = useParams() as { curationId: string };
  const logic = CurationLogic({ curationId });
  const { onSelectPageTab } = useActions(logic);
  const { queries, selectedPageTab, curation } = useValues(logic);

  const { isFlyoutOpen } = useValues(AddResultLogic);

  const pageTabs = [
    {
      label: PROMOTED_DOCUMENTS_TITLE,
      append: <EuiBadge>{curation.promoted.length}</EuiBadge>,
      isSelected: selectedPageTab === 'promoted',
      onClick: () => onSelectPageTab('promoted'),
    },
    {
      label: HIDDEN_DOCUMENTS_TITLE,
      append: <EuiBadge>{curation.hidden.length}</EuiBadge>,
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
              <DeleteCurationButton />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <ManageQueriesModal />
            </EuiFlexItem>
          </EuiFlexGroup>,
        ],
        tabs: pageTabs,
      }}
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
