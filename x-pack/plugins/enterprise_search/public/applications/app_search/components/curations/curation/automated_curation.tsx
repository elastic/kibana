/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';

import { useValues, useActions } from 'kea';

import { EuiButton, EuiBadge, EuiLoadingSpinner, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { AppSearchPageTemplate } from '../../layout';
import { AutomatedIcon } from '../components/automated_icon';

import {
  AUTOMATED_LABEL,
  COVERT_TO_MANUAL_BUTTON_LABEL,
  CONVERT_TO_MANUAL_CONFIRMATION,
} from '../constants';

import { getCurationsBreadcrumbs } from '../utils';

import { HIDDEN_DOCUMENTS_TITLE, PROMOTED_DOCUMENTS_TITLE } from './constants';
import { CurationLogic } from './curation_logic';
import { DeleteCurationButton } from './delete_curation_button';
import { PromotedDocuments, OrganicDocuments } from './documents';
import { History } from './history';

const PROMOTED = 'promoted';
const HISTORY = 'history';

export const AutomatedCuration: React.FC = () => {
  const { curationId } = useParams<{ curationId: string }>();
  const logic = CurationLogic({ curationId });
  const { convertToManual } = useActions(logic);
  const { activeQuery, dataLoading, queries, curation } = useValues(logic);
  const [selectedPageTab, setSelectedPageTab] = useState(PROMOTED);

  // This tab group is meant to visually mirror the dynamic group of tags in the ManualCuration component
  const pageTabs = [
    {
      label: PROMOTED_DOCUMENTS_TITLE,
      append: <EuiBadge>{curation.promoted.length}</EuiBadge>,
      isSelected: selectedPageTab === PROMOTED,
      onClick: () => setSelectedPageTab(PROMOTED),
    },
    {
      label: HIDDEN_DOCUMENTS_TITLE,
      append: <EuiBadge isDisabled>0</EuiBadge>,
      isSelected: false,
      disabled: true,
    },
    {
      label: 'History',
      isSelected: selectedPageTab === HISTORY,
      onClick: () => setSelectedPageTab(HISTORY),
    },
  ];

  return (
    <AppSearchPageTemplate
      pageChrome={getCurationsBreadcrumbs([queries.join(', ')])}
      pageHeader={{
        pageTitle: (
          <>
            {dataLoading ? <EuiLoadingSpinner size="l" /> : activeQuery}{' '}
            <EuiBadge iconType={AutomatedIcon} color="accent">
              {AUTOMATED_LABEL}
            </EuiBadge>
          </>
        ),
        rightSideItems: [
          <EuiFlexGroup gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <DeleteCurationButton />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                color="primary"
                fill
                iconType="exportAction"
                onClick={() => {
                  if (window.confirm(CONVERT_TO_MANUAL_CONFIRMATION)) convertToManual();
                }}
              >
                {COVERT_TO_MANUAL_BUTTON_LABEL}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>,
        ],
        tabs: pageTabs,
      }}
      isLoading={dataLoading}
    >
      {selectedPageTab === PROMOTED && <PromotedDocuments />}
      {selectedPageTab === PROMOTED && <OrganicDocuments />}
      {selectedPageTab === HISTORY && <History query={curation.queries[0]} />}
    </AppSearchPageTemplate>
  );
};
