/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';

import { useValues, useActions } from 'kea';

import { EuiSpacer, EuiButton, EuiBadge } from '@elastic/eui';

import { AppSearchPageTemplate } from '../../layout';
import { AutomatedIcon } from '../components/automated_icon';
import {
  AUTOMATED_LABEL,
  COVERT_TO_MANUAL_BUTTON_LABEL,
  CONVERT_TO_MANUAL_CONFIRMATION,
} from '../constants';
import { getCurationsBreadcrumbs } from '../utils';

import { CurationLogic } from './curation_logic';
import { PromotedDocuments, OrganicDocuments } from './documents';

export const AutomatedCuration: React.FC = () => {
  const { curationId } = useParams<{ curationId: string }>();
  const logic = CurationLogic({ curationId });
  const { convertToManual } = useActions(logic);
  const { activeQuery, dataLoading, queries } = useValues(logic);

  return (
    <AppSearchPageTemplate
      pageChrome={getCurationsBreadcrumbs([queries.join(', ')])}
      pageHeader={{
        pageTitle: (
          <>
            {activeQuery}{' '}
            <EuiBadge iconType={AutomatedIcon} color="accent">
              {AUTOMATED_LABEL}
            </EuiBadge>
          </>
        ),
        rightSideItems: [
          <EuiButton
            color="primary"
            fill
            iconType="exportAction"
            onClick={() => {
              if (window.confirm(CONVERT_TO_MANUAL_CONFIRMATION)) convertToManual();
            }}
          >
            {COVERT_TO_MANUAL_BUTTON_LABEL}
          </EuiButton>,
        ],
      }}
      isLoading={dataLoading}
    >
      <PromotedDocuments />
      <EuiSpacer />
      <OrganicDocuments />
    </AppSearchPageTemplate>
  );
};
