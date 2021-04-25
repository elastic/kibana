/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiPageHeader, EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { FlashMessages } from '../../../shared/flash_messages';
import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';

import { AppLogic } from '../../app_logic';
import { EngineLogic, getEngineBreadcrumbs } from '../engine';

import { DocumentCreationButton } from './components';
import { DOCUMENTS_TITLE } from './constants';
import { SearchExperience } from './search_experience';

export const Documents: React.FC = () => {
  const { isMetaEngine } = useValues(EngineLogic);
  const { myRole } = useValues(AppLogic);

  return (
    <>
      <SetPageChrome trail={getEngineBreadcrumbs([DOCUMENTS_TITLE])} />
      <EuiPageHeader
        pageTitle={DOCUMENTS_TITLE}
        rightSideItems={
          myRole.canManageEngineDocuments && !isMetaEngine
            ? [<DocumentCreationButton />]
            : undefined
        }
      />
      <FlashMessages />
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
    </>
  );
};
