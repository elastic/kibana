/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useState, useCallback, useEffect, useMemo } from 'react';
import styled, { css } from 'styled-components';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalFooter,
  EuiOverlayMask,
  EuiButton,
  EuiButtonEmpty,
  EuiHorizontalRule,
  EuiCheckbox,
  EuiSpacer,
  EuiFormRow,
  EuiText,
  EuiCallOut,
} from '@elastic/eui';
import { useFetchIndexPatterns } from '../../../../detections/containers/detection_engine/rules';
import { useSignalIndex } from '../../../../detections/containers/detection_engine/alerts/use_signal_index';
import {
  ExceptionListItemSchema,
  CreateExceptionListItemSchema,
  ExceptionListType,
} from '../../../../../public/lists_plugin_deps';
import * as i18n from './translations';
import { useKibana } from '../../../lib/kibana';
import { useAppToasts } from '../../../hooks/use_app_toasts';
import { ExceptionBuilder } from '../builder';
import { useAddOrUpdateException } from '../use_add_exception';
import { AddExceptionComments } from '../add_exception_comments';
import {
  enrichExistingExceptionItemWithComments,
  enrichExceptionItemsWithOS,
  getOperatingSystems,
  entryHasListType,
  entryHasNonEcsType,
  lowercaseHashValues,
} from '../helpers';
import { Loader } from '../../loader';

interface EditExceptionModalProps {
  ruleName: string;
  ruleIndices: string[];
  exceptionItem: ExceptionListItemSchema;
  exceptionListType: ExceptionListType;
  onCancel: () => void;
  onConfirm: () => void;
}

const Modal = styled(EuiModal)`
  ${({ theme }) => css`
    width: ${theme.eui.euiBreakpoints.l};
    max-width: ${theme.eui.euiBreakpoints.l};
  `}
`;

const ModalHeader = styled(EuiModalHeader)`
  flex-direction: column;
  align-items: flex-start;
`;

const ModalHeaderSubtitle = styled.div`
  ${({ theme }) => css`
    color: ${theme.eui.euiColorMediumShade};
  `}
`;

const ModalBodySection = styled.section`
  ${({ theme }) => css`
    padding: ${theme.eui.euiSizeS} ${theme.eui.euiSizeL};

    &.builder-section {
      overflow-y: scroll;
    }
  `}
`;

export const EditExceptionModal = memo(function EditExceptionModal({
  ruleName,
  ruleIndices,
  exceptionItem,
  exceptionListType,
  onCancel,
  onConfirm,
}: EditExceptionModalProps) {
  const { http } = useKibana().services;
  const [comment, setComment] = useState('');
  const [hasVersionConflict, setHasVersionConflict] = useState(false);
  const [shouldBulkCloseAlert, setShouldBulkCloseAlert] = useState(false);
  const [shouldDisableBulkClose, setShouldDisableBulkClose] = useState(false);
  const [exceptionItemsToAdd, setExceptionItemsToAdd] = useState<
    Array<ExceptionListItemSchema | CreateExceptionListItemSchema>
  >([]);
  const { addError, addSuccess } = useAppToasts();
  const { loading: isSignalIndexLoading, signalIndexName } = useSignalIndex();
  const [
    { isLoading: isSignalIndexPatternLoading, indexPatterns: signalIndexPatterns },
  ] = useFetchIndexPatterns(signalIndexName !== null ? [signalIndexName] : [], 'signals');

  const [{ isLoading: isIndexPatternLoading, indexPatterns }] = useFetchIndexPatterns(
    ruleIndices,
    'rules'
  );

  const onError = useCallback(
    (error) => {
      if (error.message.includes('Conflict')) {
        setHasVersionConflict(true);
      } else {
        addError(error, { title: i18n.EDIT_EXCEPTION_ERROR });
        onCancel();
      }
    },
    [addError, onCancel]
  );
  const onSuccess = useCallback(() => {
    addSuccess(i18n.EDIT_EXCEPTION_SUCCESS);
    onConfirm();
  }, [addSuccess, onConfirm]);

  const [{ isLoading: addExceptionIsLoading }, addOrUpdateExceptionItems] = useAddOrUpdateException(
    {
      http,
      onSuccess,
      onError,
    }
  );

  useEffect(() => {
    if (isSignalIndexPatternLoading === false && isSignalIndexLoading === false) {
      setShouldDisableBulkClose(
        entryHasListType(exceptionItemsToAdd) ||
          entryHasNonEcsType(exceptionItemsToAdd, signalIndexPatterns) ||
          exceptionItemsToAdd.length === 0
      );
    }
  }, [
    setShouldDisableBulkClose,
    exceptionItemsToAdd,
    isSignalIndexPatternLoading,
    isSignalIndexLoading,
    signalIndexPatterns,
  ]);

  useEffect(() => {
    if (shouldDisableBulkClose === true) {
      setShouldBulkCloseAlert(false);
    }
  }, [shouldDisableBulkClose]);

  const isSubmitButtonDisabled = useMemo(
    () => exceptionItemsToAdd.every((item) => item.entries.length === 0) || hasVersionConflict,
    [exceptionItemsToAdd, hasVersionConflict]
  );

  const handleBuilderOnChange = useCallback(
    ({
      exceptionItems,
    }: {
      exceptionItems: Array<ExceptionListItemSchema | CreateExceptionListItemSchema>;
    }) => {
      setExceptionItemsToAdd(exceptionItems);
    },
    [setExceptionItemsToAdd]
  );

  const onCommentChange = useCallback(
    (value: string) => {
      setComment(value);
    },
    [setComment]
  );

  const onBulkCloseAlertCheckboxChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setShouldBulkCloseAlert(event.currentTarget.checked);
    },
    [setShouldBulkCloseAlert]
  );

  const enrichExceptionItems = useCallback(() => {
    const [exceptionItemToEdit] = exceptionItemsToAdd;
    let enriched: Array<ExceptionListItemSchema | CreateExceptionListItemSchema> = [
      {
        ...enrichExistingExceptionItemWithComments(exceptionItemToEdit, [
          ...exceptionItem.comments,
          ...(comment.trim() !== '' ? [{ comment }] : []),
        ]),
      },
    ];
    if (exceptionListType === 'endpoint') {
      const osTypes = exceptionItem._tags ? getOperatingSystems(exceptionItem._tags) : [];
      enriched = lowercaseHashValues(enrichExceptionItemsWithOS(enriched, osTypes));
    }
    return enriched;
  }, [exceptionItemsToAdd, exceptionItem, comment, exceptionListType]);

  const onEditExceptionConfirm = useCallback(() => {
    if (addOrUpdateExceptionItems !== null) {
      const bulkCloseIndex =
        shouldBulkCloseAlert && signalIndexName !== null ? [signalIndexName] : undefined;
      addOrUpdateExceptionItems(enrichExceptionItems(), undefined, bulkCloseIndex);
    }
  }, [addOrUpdateExceptionItems, enrichExceptionItems, shouldBulkCloseAlert, signalIndexName]);

  return (
    <EuiOverlayMask onClick={onCancel}>
      <Modal onClose={onCancel} data-test-subj="add-exception-modal">
        <ModalHeader>
          <EuiModalHeaderTitle>
            {exceptionListType === 'endpoint'
              ? i18n.EDIT_ENDPOINT_EXCEPTION_TITLE
              : i18n.EDIT_EXCEPTION_TITLE}
          </EuiModalHeaderTitle>
          <ModalHeaderSubtitle className="eui-textTruncate" title={ruleName}>
            {ruleName}
          </ModalHeaderSubtitle>
        </ModalHeader>

        {(addExceptionIsLoading || isIndexPatternLoading || isSignalIndexLoading) && (
          <Loader data-test-subj="loadingEditExceptionModal" size="xl" />
        )}

        {!isSignalIndexLoading && !addExceptionIsLoading && !isIndexPatternLoading && (
          <>
            <ModalBodySection className="builder-section">
              <EuiText>{i18n.EXCEPTION_BUILDER_INFO}</EuiText>
              <EuiSpacer />
              <ExceptionBuilder
                exceptionListItems={[exceptionItem]}
                listType={exceptionListType}
                listId={exceptionItem.list_id}
                listNamespaceType={exceptionItem.namespace_type}
                ruleName={ruleName}
                isOrDisabled
                isAndDisabled={false}
                isNestedDisabled={false}
                data-test-subj="edit-exception-modal-builder"
                id-aria="edit-exception-modal-builder"
                onChange={handleBuilderOnChange}
                indexPatterns={indexPatterns}
              />

              <EuiSpacer />

              <AddExceptionComments
                exceptionItemComments={exceptionItem.comments}
                newCommentValue={comment}
                newCommentOnChange={onCommentChange}
              />
            </ModalBodySection>
            <EuiHorizontalRule />
            <ModalBodySection>
              <EuiFormRow fullWidth>
                <EuiCheckbox
                  id="close-alert-on-add-add-exception-checkbox"
                  label={
                    shouldDisableBulkClose ? i18n.BULK_CLOSE_LABEL_DISABLED : i18n.BULK_CLOSE_LABEL
                  }
                  checked={shouldBulkCloseAlert}
                  onChange={onBulkCloseAlertCheckboxChange}
                  disabled={shouldDisableBulkClose}
                />
              </EuiFormRow>
              {exceptionListType === 'endpoint' && (
                <>
                  <EuiSpacer />
                  <EuiText color="subdued" size="s">
                    {i18n.ENDPOINT_QUARANTINE_TEXT}
                  </EuiText>
                </>
              )}
            </ModalBodySection>
          </>
        )}

        {hasVersionConflict && (
          <ModalBodySection>
            <EuiCallOut title={i18n.VERSION_CONFLICT_ERROR_TITLE} color="danger" iconType="alert">
              <p>{i18n.VERSION_CONFLICT_ERROR_DESCRIPTION}</p>
            </EuiCallOut>
          </ModalBodySection>
        )}

        <EuiModalFooter>
          <EuiButtonEmpty onClick={onCancel}>{i18n.CANCEL}</EuiButtonEmpty>

          <EuiButton
            onClick={onEditExceptionConfirm}
            isLoading={addExceptionIsLoading}
            isDisabled={isSubmitButtonDisabled}
            fill
          >
            {i18n.EDIT_EXCEPTION_SAVE_BUTTON}
          </EuiButton>
        </EuiModalFooter>
      </Modal>
    </EuiOverlayMask>
  );
});
