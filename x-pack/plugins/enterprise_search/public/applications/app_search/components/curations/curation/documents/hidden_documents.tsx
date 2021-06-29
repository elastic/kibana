/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { DataPanel } from '../../../data_panel';

import { SHOW_DOCUMENT_ACTION } from '../../constants';
import { CurationLogic } from '../curation_logic';
import { AddResultButton, CurationResult, convertToResultFormat } from '../results';

export const HiddenDocuments: React.FC = () => {
  const { clearHiddenIds, removeHiddenId } = useActions(CurationLogic);
  const { curation, hiddenDocumentsLoading } = useValues(CurationLogic);

  const documents = curation.hidden;
  const hasDocuments = documents.length > 0;

  return (
    <DataPanel
      filled
      iconType="eyeClosed"
      title={
        <h2>
          {i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.curations.hiddenDocuments.title',
            { defaultMessage: 'Hidden documents' }
          )}
        </h2>
      }
      subtitle={i18n.translate(
        'xpack.enterpriseSearch.appSearch.engine.curations.hiddenDocuments.description',
        { defaultMessage: 'Hidden documents will not appear in organic results.' }
      )}
      action={
        hasDocuments && (
          <EuiFlexGroup gutterSize="s" responsive={false} wrap>
            <EuiFlexItem>
              <AddResultButton />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiButtonEmpty onClick={clearHiddenIds} iconType="menuUp" size="s">
                {i18n.translate(
                  'xpack.enterpriseSearch.appSearch.engine.curations.hiddenDocuments.removeAllButtonLabel',
                  { defaultMessage: 'Restore all' }
                )}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        )
      }
      isLoading={hiddenDocumentsLoading}
    >
      {hasDocuments ? (
        documents.map((document) => (
          <CurationResult
            key={document.id}
            result={convertToResultFormat(document)}
            actions={[
              {
                ...SHOW_DOCUMENT_ACTION,
                onClick: () => removeHiddenId(document.id),
              },
            ]}
          />
        ))
      ) : (
        <EuiEmptyPrompt
          titleSize="s"
          title={
            <h3>
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.engine.curations.hiddenDocuments.emptyTitle',
                { defaultMessage: "You haven't hidden any documents yet" }
              )}
            </h3>
          }
          body={i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.curations.hiddenDocuments.emptyDescription',
            {
              defaultMessage:
                'Hide documents by clicking the eye icon on the organic results above, or search and hide a result manually.',
            }
          )}
          actions={<AddResultButton />}
        />
      )}
    </DataPanel>
  );
};
