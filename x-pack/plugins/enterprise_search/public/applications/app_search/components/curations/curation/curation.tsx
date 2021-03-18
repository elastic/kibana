/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { useValues, useActions } from 'kea';

import { EuiPageHeader, EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { FlashMessages } from '../../../../shared/flash_messages';
import { SetAppSearchChrome as SetPageChrome } from '../../../../shared/kibana_chrome';
import { BreadcrumbTrail } from '../../../../shared/kibana_chrome/generate_breadcrumbs';
import { Loading } from '../../../../shared/loading';

import { MANAGE_CURATION_TITLE, RESTORE_CONFIRMATION } from '../constants';

import { CurationLogic } from './curation_logic';
import { PromotedDocuments, OrganicDocuments, HiddenDocuments } from './documents';
import { ActiveQuerySelect, ManageQueriesModal } from './queries';

interface Props {
  curationsBreadcrumb: BreadcrumbTrail;
}

export const Curation: React.FC<Props> = ({ curationsBreadcrumb }) => {
  const { curationId } = useParams() as { curationId: string };
  const { loadCuration, resetCuration } = useActions(CurationLogic({ curationId }));
  const { dataLoading, queries } = useValues(CurationLogic({ curationId }));

  useEffect(() => {
    loadCuration();
  }, [curationId]);

  if (dataLoading) return <Loading />;

  return (
    <>
      <SetPageChrome trail={[...curationsBreadcrumb, queries.join(', ')]} />
      <EuiPageHeader
        pageTitle={MANAGE_CURATION_TITLE}
        rightSideItems={[
          <EuiButton
            color="danger"
            onClick={() => {
              if (window.confirm(RESTORE_CONFIRMATION)) resetCuration();
            }}
          >
            {i18n.translate('xpack.enterpriseSearch.appSearch.actions.restoreDefaults', {
              defaultMessage: 'Restore defaults',
            })}
          </EuiButton>,
        ]}
        responsive={false}
      />

      <EuiFlexGroup alignItems="flexEnd" gutterSize="xl" responsive={false}>
        <EuiFlexItem>
          <ActiveQuerySelect />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ManageQueriesModal />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="xl" />
      <FlashMessages />

      <PromotedDocuments />
      <EuiSpacer />
      <OrganicDocuments />
      <EuiSpacer />
      <HiddenDocuments />

      {/* TODO: AddResult flyout */}
    </>
  );
};
