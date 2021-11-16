/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiEmptyPrompt,
  EuiButtonEmpty,
  EuiDragDropContext,
  DropResult,
  EuiDroppable,
  EuiDraggable,
  euiDragDropReorder,
  EuiBadge,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { DataPanel } from '../../../data_panel';

import { DEMOTE_DOCUMENT_ACTION } from '../../constants';
import { PROMOTED_DOCUMENTS_TITLE } from '../constants';
import { CurationLogic } from '../curation_logic';
import { AddResultButton, CurationResult, convertToResultFormat } from '../results';

import './promoted_documents.scss';

export const PromotedDocuments: React.FC = () => {
  const { curation, isAutomated, promotedIds, promotedDocumentsLoading } = useValues(CurationLogic);
  const documents = curation.promoted;
  const hasDocuments = documents.length > 0;

  const { setPromotedIds, clearPromotedIds, removePromotedId } = useActions(CurationLogic);
  const reorderPromotedIds = ({ source, destination }: DropResult) => {
    if (source && destination) {
      const reorderedIds = euiDragDropReorder(promotedIds, source.index, destination.index);
      setPromotedIds(reorderedIds);
    }
  };

  const CountBadge: React.FC = () => <EuiBadge color="accent">{documents.length}</EuiBadge>;

  return (
    <DataPanel
      iconType={CountBadge}
      title={<h2>{PROMOTED_DOCUMENTS_TITLE}</h2>}
      action={
        isAutomated ? (
          <EuiText color="subdued" size="s">
            <p>
              <em>
                {i18n.translate(
                  'xpack.enterpriseSearch.appSearch.engine.curations.promotedDocuments.managedByAppSearchDescription',
                  { defaultMessage: 'This curation is being automated by App Search' }
                )}
              </em>
            </p>
          </EuiText>
        ) : (
          hasDocuments && (
            <EuiFlexGroup gutterSize="s" responsive={false} wrap>
              <EuiFlexItem>
                <EuiButtonEmpty
                  onClick={clearPromotedIds}
                  color="danger"
                  size="s"
                  disabled={isAutomated}
                >
                  {i18n.translate(
                    'xpack.enterpriseSearch.appSearch.engine.curations.promotedDocuments.removeAllButtonLabel',
                    { defaultMessage: 'Demote all' }
                  )}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem>
                <AddResultButton />
              </EuiFlexItem>
            </EuiFlexGroup>
          )
        )
      }
      isLoading={promotedDocumentsLoading}
    >
      {hasDocuments ? (
        <EuiDragDropContext onDragEnd={reorderPromotedIds}>
          <EuiDroppable
            droppableId="PromotedDocuments"
            spacing="m"
            className="promotedDocuments--results"
          >
            <EuiFlexGroup direction="column" gutterSize="s">
              {documents.map((document, index) => (
                <EuiFlexItem key={index}>
                  <EuiDraggable
                    index={index}
                    draggableId={document.id}
                    customDragHandle
                    spacing="none"
                    isDragDisabled={isAutomated}
                  >
                    {(provided) => (
                      <CurationResult
                        index={index}
                        result={convertToResultFormat(document)}
                        actions={
                          isAutomated
                            ? []
                            : [
                                {
                                  ...DEMOTE_DOCUMENT_ACTION,
                                  onClick: () => removePromotedId(document.id),
                                },
                              ]
                        }
                        dragHandleProps={provided.dragHandleProps}
                      />
                    )}
                  </EuiDraggable>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiDroppable>
        </EuiDragDropContext>
      ) : (
        <EuiEmptyPrompt
          body={
            isAutomated
              ? i18n.translate(
                  'xpack.enterpriseSearch.appSearch.engine.curations.promotedDocuments.automatedEmptyDescription',
                  {
                    defaultMessage: "We haven't identified any documents to promote",
                  }
                )
              : i18n.translate(
                  'xpack.enterpriseSearch.appSearch.engine.curations.promotedDocuments.emptyDescription',
                  {
                    defaultMessage:
                      'Star documents from the organic results below, or search and promote a result manually.',
                  }
                )
          }
          actions={<AddResultButton />}
        />
      )}
    </DataPanel>
  );
};
