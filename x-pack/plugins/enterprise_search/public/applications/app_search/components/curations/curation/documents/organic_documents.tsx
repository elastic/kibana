/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import { EuiLoadingContent, EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { DataPanel } from '../../../data_panel';
import { Result } from '../../../result/types';

import {
  RESULT_ACTIONS_DIRECTIONS,
  PROMOTE_DOCUMENT_ACTION,
  HIDE_DOCUMENT_ACTION,
} from '../../constants';
import { CurationLogic } from '../curation_logic';
import { CurationResult } from '../results';

export const OrganicDocuments: React.FC = () => {
  const { addPromotedId, addHiddenId } = useActions(CurationLogic);
  const { curation, activeQuery, organicDocumentsLoading } = useValues(CurationLogic);

  const documents = curation.organic;
  const hasDocuments = documents.length > 0 && !organicDocumentsLoading;
  const currentQuery = activeQuery;

  return (
    <DataPanel
      filled
      iconType="search"
      title={
        <h2>
          {i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.curations.organicDocuments.title',
            {
              defaultMessage: 'Top organic documents for "{currentQuery}"',
              values: { currentQuery },
            }
          )}
        </h2>
      }
      subtitle={RESULT_ACTIONS_DIRECTIONS}
    >
      {hasDocuments ? (
        documents.map((document: Result) => (
          <CurationResult
            result={document}
            key={document.id.raw}
            actions={[
              {
                ...HIDE_DOCUMENT_ACTION,
                onClick: () => addHiddenId(document.id.raw),
              },
              {
                ...PROMOTE_DOCUMENT_ACTION,
                onClick: () => addPromotedId(document.id.raw),
              },
            ]}
          />
        ))
      ) : organicDocumentsLoading ? (
        <EuiLoadingContent lines={5} />
      ) : (
        <EuiEmptyPrompt
          body={i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.curations.organicDocuments.emptyDescription',
            {
              defaultMessage:
                'No organic results to display. Add or change the active query above.',
            }
          )}
        />
      )}
    </DataPanel>
  );
};
