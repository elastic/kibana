/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useState, useCallback, useEffect } from 'react';
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
} from '@elastic/eui';
import { alertsIndexPattern } from '../../../../../common/endpoint/constants';
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
  enrichExceptionItemsWithComments,
  enrichExceptionItemsWithOS,
  getOperatingSystems,
  entryHasListType,
  entryHasNonEcsType,
} from '../helpers';

interface EditExceptionModalProps {
  ruleName: string;
  exceptionItem: ExceptionListItemSchema;
  exceptionListType: ExceptionListType;
  onCancel: () => void;
  onConfirm: () => void;
}

const Modal = styled(EuiModal)`
  ${({ theme }) => css`
    width: ${theme.eui.euiBreakpoints.m};
  `}
`;

const ModalHeader = styled(EuiModalHeader)`
  ${({ theme }) => css`
    flex-direction: column;
    align-items: flex-start;
  `}
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
  exceptionItem,
  exceptionListType,
  onCancel,
  onConfirm,
}: EditExceptionModalProps) {
  const { http } = useKibana().services;
  const [comment, setComment] = useState('');
  const [shouldBulkCloseAlert, setShouldBulkCloseAlert] = useState(false);
  const [shouldDisableBulkClose, setShouldDisableBulkClose] = useState(false);
  const [exceptionItemsToAdd, setExceptionItemsToAdd] = useState<
    Array<ExceptionListItemSchema | CreateExceptionListItemSchema>
  >([]);
  const { addError, addSuccess } = useAppToasts();
  const { loading: isSignalIndexLoading, signalIndexName } = useSignalIndex();

  const [{ isLoading: indexPatternLoading, indexPatterns }] = useFetchIndexPatterns(
    signalIndexName !== null ? [signalIndexName] : []
  );

  const onError = useCallback(
    (error) => {
      addError(error, { title: i18n.EDIT_EXCEPTION_ERROR });
      onCancel();
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
    if (indexPatternLoading === false && isSignalIndexLoading === false) {
      setShouldDisableBulkClose(
        entryHasListType(exceptionItemsToAdd) ||
          entryHasNonEcsType(exceptionItemsToAdd, indexPatterns)
      );
    }
  }, [
    setShouldDisableBulkClose,
    exceptionItemsToAdd,
    indexPatternLoading,
    isSignalIndexLoading,
    indexPatterns,
  ]);

  useEffect(() => {
    if (shouldDisableBulkClose === true) {
      setShouldBulkCloseAlert(false);
    }
  }, [shouldDisableBulkClose]);

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
    let enriched: Array<ExceptionListItemSchema | CreateExceptionListItemSchema> = [];
    enriched = enrichExceptionItemsWithComments(exceptionItemsToAdd, [
      ...(exceptionItem.comments ? exceptionItem.comments : []),
      ...(comment !== '' ? [{ comment }] : []),
    ]);
    if (exceptionListType === 'endpoint') {
      const osTypes = exceptionItem._tags ? getOperatingSystems(exceptionItem._tags) : [];
      enriched = enrichExceptionItemsWithOS(enriched, osTypes);
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

  const indexPatternConfig = useCallback(() => {
    if (exceptionListType === 'endpoint') {
      return [alertsIndexPattern];
    }
    return signalIndexName ? [signalIndexName] : [];
  }, [exceptionListType, signalIndexName]);

  return (
    <EuiOverlayMask>
      <Modal onClose={onCancel} data-test-subj="add-exception-modal">
        <ModalHeader>
          <EuiModalHeaderTitle>{i18n.EDIT_EXCEPTION_TITLE}</EuiModalHeaderTitle>
          <ModalHeaderSubtitle className="eui-textTruncate" title={ruleName}>
            {ruleName}
          </ModalHeaderSubtitle>
        </ModalHeader>

        {!isSignalIndexLoading && (
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
                isLoading={false}
                isOrDisabled={false}
                isAndDisabled={false}
                data-test-subj="edit-exception-modal-builder"
                id-aria="edit-exception-modal-builder"
                onChange={handleBuilderOnChange}
                indexPatternConfig={indexPatternConfig()}
              />

              <EuiSpacer />

              {exceptionListType === 'endpoint' && (
                <>
                  <EuiText size="s">{i18n.ENDPOINT_QUARANTINE_TEXT}</EuiText>
                  <EuiSpacer />
                </>
              )}

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
            </ModalBodySection>
          </>
        )}

        <EuiModalFooter>
          <EuiButtonEmpty onClick={onCancel}>{i18n.CANCEL}</EuiButtonEmpty>

          <EuiButton onClick={onEditExceptionConfirm} isLoading={addExceptionIsLoading} fill>
            {i18n.EDIT_EXCEPTION_SAVE_BUTTON}
          </EuiButton>
        </EuiModalFooter>
      </Modal>
    </EuiOverlayMask>
  );
});
