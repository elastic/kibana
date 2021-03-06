/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { useValues, useActions } from 'kea';

import { EuiPageHeader, EuiSpacer, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { FlashMessages } from '../../../../shared/flash_messages';
import { SetAppSearchChrome as SetPageChrome } from '../../../../shared/kibana_chrome';
import { BreadcrumbTrail } from '../../../../shared/kibana_chrome/generate_breadcrumbs';
import { Loading } from '../../../../shared/loading';

import { MANAGE_CURATION_TITLE } from '../constants';

import { CurationLogic } from './curation_logic';
import { OrganicDocuments } from './documents';
import { ActiveQuerySelect, ManageQueriesModal } from './queries';

interface Props {
  curationsBreadcrumb: BreadcrumbTrail;
}

export const Curation: React.FC<Props> = ({ curationsBreadcrumb }) => {
  const { curationId } = useParams() as { curationId: string };
  const { loadCuration } = useActions(CurationLogic({ curationId }));
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
        /* TODO: Restore defaults button */
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

      {/* TODO: PromotedDocuments section */}
      <OrganicDocuments />
      {/* TODO: HiddenDocuments section */}

      {/* TODO: AddResult flyout */}
    </>
  );
};
