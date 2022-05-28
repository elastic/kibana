/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import { EuiBadge, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { DataPanel } from '../../../data_panel';

import { SHOW_DOCUMENT_ACTION } from '../../constants';
import { HIDDEN_DOCUMENTS_TITLE } from '../constants';
import { CurationLogic } from '../curation_logic';
import { AddResultButton, CurationResult, convertToResultFormat } from '../results';

export const HiddenDocuments: React.FC = () => {
  const { clearHiddenIds, removeHiddenId } = useActions(CurationLogic);
  const { curation, hiddenDocumentsLoading } = useValues(CurationLogic);

  const documents = curation.hidden;
  const hasDocuments = documents.length > 0;

  const CountBadge: React.FC = () => <EuiBadge color="accent">{documents.length}</EuiBadge>;

  return (
    <DataPanel
      iconType={CountBadge}
      title={<h2>{HIDDEN_DOCUMENTS_TITLE}</h2>}
      action={
        hasDocuments && (
          <EuiFlexGroup gutterSize="s" responsive={false} wrap>
            <EuiFlexItem>
              <EuiButtonEmpty onClick={clearHiddenIds} size="s">
                {i18n.translate(
                  'xpack.enterpriseSearch.appSearch.engine.curations.hiddenDocuments.removeAllButtonLabel',
                  { defaultMessage: 'Unhide all' }
                )}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem>
              <AddResultButton />
            </EuiFlexItem>
          </EuiFlexGroup>
        )
      }
      isLoading={hiddenDocumentsLoading}
    >
      {hasDocuments ? (
        <EuiFlexGroup direction="column" gutterSize="s">
          {documents.map((document, index) => (
            <EuiFlexItem key={index}>
              <CurationResult
                result={convertToResultFormat(document)}
                index={index}
                actions={[
                  {
                    ...SHOW_DOCUMENT_ACTION,
                    onClick: () => removeHiddenId(document.id),
                  },
                ]}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
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
