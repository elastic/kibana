/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import { EuiLoadingContent, EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { LeafIcon } from '../../../../../shared/icons';

import { DataPanel } from '../../../data_panel';
import { Result } from '../../../result/types';

import { PROMOTE_DOCUMENT_ACTION, HIDE_DOCUMENT_ACTION } from '../../constants';
import { CurationLogic } from '../curation_logic';
import { CurationResult } from '../results';

export const OrganicDocuments: React.FC = () => {
  const { addPromotedId, addHiddenId } = useActions(CurationLogic);
  const { curation, activeQuery, isAutomated, organicDocumentsLoading } = useValues(CurationLogic);

  const documents = curation.organic || [];
  const hasDocuments = documents.length > 0 && !organicDocumentsLoading;
  const currentQuery = activeQuery;

  return (
    <DataPanel
      iconType={LeafIcon}
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
    >
      {hasDocuments ? (
        <EuiFlexGroup direction="column" gutterSize="s">
          {documents.map((document: Result, index) => (
            <EuiFlexItem key={index}>
              <CurationResult
                result={document}
                index={index}
                actions={
                  isAutomated
                    ? []
                    : [
                        {
                          ...HIDE_DOCUMENT_ACTION,
                          onClick: () => addHiddenId(document.id.raw),
                        },
                        {
                          ...PROMOTE_DOCUMENT_ACTION,
                          onClick: () => addPromotedId(document.id.raw),
                        },
                      ]
                }
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      ) : organicDocumentsLoading ? (
        <EuiLoadingContent lines={5} />
      ) : (
        <EuiEmptyPrompt
          body={
            <FormattedMessage
              id="xpack.enterpriseSearch.appSearch.engine.curations.organicDocuments.description"
              defaultMessage="No organic results to display.{manualDescription}"
              values={{
                manualDescription: !isAutomated && (
                  <>
                    {' '}
                    <FormattedMessage
                      id="xpack.enterpriseSearch.appSearch.engine.curations.organicDocuments.manualDescription"
                      defaultMessage="Add or change the active query above."
                    />
                  </>
                ),
              }}
            />
          }
        />
      )}
    </DataPanel>
  );
};
