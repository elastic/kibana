/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { AppLogic } from '../../app_logic';
import { EngineLogic, getEngineBreadcrumbs } from '../engine';
import { AppSearchPageTemplate } from '../layout';

import { DocumentCreationButton, EmptyState } from './components';
import { DOCUMENTS_TITLE } from './constants';
import { SearchExperience } from './search_experience';

export const Documents: React.FC = () => {
  const { isMetaEngine, isEngineEmpty } = useValues(EngineLogic);
  const { myRole } = useValues(AppLogic);

  return (
    <AppSearchPageTemplate
      pageChrome={getEngineBreadcrumbs([DOCUMENTS_TITLE])}
      pageHeader={{
        pageTitle: DOCUMENTS_TITLE,
        rightSideItems:
          myRole.canManageEngineDocuments && !isMetaEngine ? [<DocumentCreationButton />] : [],
      }}
      isEmptyState={isEngineEmpty}
      emptyState={<EmptyState />}
    >
      {isMetaEngine && (
        <>
          <EuiCallOut
            data-test-subj="MetaEnginesCallout"
            iconType="iInCircle"
            title={i18n.translate(
              'xpack.enterpriseSearch.appSearch.documents.metaEngineCallout.title',
              {
                defaultMessage: 'You are within a Meta Engine.',
              }
            )}
          >
            <p>
              {i18n.translate('xpack.enterpriseSearch.appSearch.documents.metaEngineCallout', {
                defaultMessage:
                  'Meta Engines have many Source Engines. Visit your Source Engines to alter their documents.',
              })}
            </p>
          </EuiCallOut>
          <EuiSpacer />
        </>
      )}
      <SearchExperience />
    </AppSearchPageTemplate>
  );
};
