/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { useValues, useActions } from 'kea';

import { EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiButton, EuiBadge } from '@elastic/eui';

import { RESTORE_DEFAULTS_BUTTON_LABEL } from '../../../constants';
import { AppSearchPageTemplate } from '../../layout';
import { AUTOMATED_LABEL, MANAGE_CURATION_TITLE, RESTORE_CONFIRMATION } from '../constants';
import { getCurationsBreadcrumbs } from '../utils';

import { AutomatedIcon } from './automated_icon';
import { CurationLogic } from './curation_logic';
import { PromotedDocuments, OrganicDocuments, HiddenDocuments } from './documents';
import { ActiveQuerySelect, ManageQueriesModal } from './queries';
import { AddResultLogic, AddResultFlyout } from './results';

export const Curation: React.FC = () => {
  const { curationId } = useParams() as { curationId: string };
  const { loadCuration, resetCuration } = useActions(CurationLogic({ curationId }));
  const { curation, dataLoading, queries } = useValues(CurationLogic({ curationId }));
  const { isFlyoutOpen } = useValues(AddResultLogic);

  useEffect(() => {
    loadCuration();
  }, [curationId]);

  const isAutomated = curation.suggestion?.status === 'automated';

  return (
    <AppSearchPageTemplate
      pageChrome={getCurationsBreadcrumbs([queries.join(', ')])}
      pageHeader={{
        pageTitle: (
          <>
            {MANAGE_CURATION_TITLE}
            {isAutomated && (
              <>
                {' '}
                <EuiBadge iconType={AutomatedIcon} color="accent">
                  {AUTOMATED_LABEL}
                </EuiBadge>
              </>
            )}
          </>
        ),
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
      }}
      isLoading={dataLoading}
    >
      <EuiFlexGroup alignItems="flexEnd" gutterSize="xl" responsive={false}>
        <EuiFlexItem>
          <ActiveQuerySelect />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ManageQueriesModal />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="xl" />

      <PromotedDocuments />
      <EuiSpacer />
      <OrganicDocuments />
      <EuiSpacer />
      <HiddenDocuments />

      {isFlyoutOpen && <AddResultFlyout />}
    </AppSearchPageTemplate>
  );
};
