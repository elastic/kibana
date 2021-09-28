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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { DataPanel } from '../../../data_panel';

import { DEMOTE_DOCUMENT_ACTION } from '../../constants';
import { CurationLogic } from '../curation_logic';
import { AddResultButton, CurationResult, convertToResultFormat } from '../results';

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

  return (
    <DataPanel
      filled
      iconType="starFilled"
      title={
        <h2>
          {i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.curations.promotedDocuments.title',
            { defaultMessage: 'Promoted documents' }
          )}
        </h2>
      }
      subtitle={
        <FormattedMessage
          id="xpack.enterpriseSearch.appSearch.engine.curations.promotedDocuments.description"
          defaultMessage="Promoted results appear before organic results.{manualDescription}"
          values={{
            manualDescription: !isAutomated && (
              <>
                {' '}
                <FormattedMessage
                  id="xpack.enterpriseSearch.appSearch.engine.curations.promotedDocuments.manualDescription"
                  defaultMessage="Documents can be re-ordered."
                />
              </>
            ),
          }}
        />
      }
      action={
        hasDocuments && (
          <EuiFlexGroup gutterSize="s" responsive={false} wrap>
            <EuiFlexItem>
              <AddResultButton />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiButtonEmpty
                onClick={clearPromotedIds}
                iconType="menuDown"
                size="s"
                disabled={isAutomated}
              >
                {i18n.translate(
                  'xpack.enterpriseSearch.appSearch.engine.curations.promotedDocuments.removeAllButtonLabel',
                  { defaultMessage: 'Demote all' }
                )}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        )
      }
      isLoading={promotedDocumentsLoading}
    >
      {hasDocuments ? (
        <EuiDragDropContext onDragEnd={reorderPromotedIds}>
          <EuiDroppable droppableId="PromotedDocuments" spacing="m">
            {documents.map((document, i: number) => (
              <EuiDraggable
                index={i}
                key={document.id}
                draggableId={document.id}
                customDragHandle
                spacing="none"
                isDragDisabled={isAutomated}
              >
                {(provided) => (
                  <CurationResult
                    key={document.id}
                    result={convertToResultFormat(document)}
                    actions={[
                      {
                        ...DEMOTE_DOCUMENT_ACTION,
                        onClick: () => removePromotedId(document.id),
                        disabled: isAutomated,
                      },
                    ]}
                    dragHandleProps={provided.dragHandleProps}
                  />
                )}
              </EuiDraggable>
            ))}
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
