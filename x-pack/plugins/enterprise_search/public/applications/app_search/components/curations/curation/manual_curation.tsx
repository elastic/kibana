/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';

import { useValues, useActions } from 'kea';

import { EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { RESTORE_DEFAULTS_BUTTON_LABEL } from '../../../constants';
import { AppSearchPageTemplate } from '../../layout';
import { MANAGE_CURATION_TITLE, RESTORE_CONFIRMATION } from '../constants';
import { getCurationsBreadcrumbs } from '../utils';

import { CurationLogic } from './curation_logic';
import { PromotedDocuments, OrganicDocuments, HiddenDocuments } from './documents';
import { ActiveQuerySelect, ManageQueriesModal } from './queries';
import { AddResultLogic, AddResultFlyout } from './results';
import { SuggestedDocumentsCallout } from './suggested_documents_callout';

export const ManualCuration: React.FC = () => {
  const { curationId } = useParams() as { curationId: string };
  const { onSelectPageTab, resetCuration } = useActions(CurationLogic({ curationId }));
  const { dataLoading, queries, selectedPageTab } = useValues(CurationLogic({ curationId }));
  const { isFlyoutOpen } = useValues(AddResultLogic);

  const pageTabs = [
    {
      label: i18n.translate(
        'xpack.enterpriseSearch.appSearch.engine.curations.promotedDocuments.title',
        { defaultMessage: 'Promoted documents' }
      ),
      isSelected: selectedPageTab === 'promoted',
      onClick: () => onSelectPageTab('promoted'),
    },
    {
      label: i18n.translate(
        'xpack.enterpriseSearch.appSearch.engine.curations.hiddenDocuments.title',
        { defaultMessage: 'Hidden documents' }
      ),
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
          <EuiButton
            color="danger"
            onClick={() => {
              if (window.confirm(RESTORE_CONFIRMATION)) resetCuration();
            }}
          >
            {RESTORE_DEFAULTS_BUTTON_LABEL}
          </EuiButton>,
        ],
        tabs: pageTabs,
      }}
      isLoading={dataLoading}
    >
      <SuggestedDocumentsCallout />
      <EuiFlexGroup alignItems="flexEnd" gutterSize="xl" responsive={false}>
        <EuiFlexItem>
          <ActiveQuerySelect />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ManageQueriesModal />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xl" />
      {selectedPageTab === 'promoted' && <PromotedDocuments />}
      {selectedPageTab === 'hidden' && <HiddenDocuments />}
      <EuiSpacer />
      <OrganicDocuments />

      {isFlyoutOpen && <AddResultFlyout />}
    </AppSearchPageTemplate>
  );
};
