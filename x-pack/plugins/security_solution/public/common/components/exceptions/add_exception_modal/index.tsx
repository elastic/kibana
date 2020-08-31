/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useEffect, useState, useCallback, useMemo } from 'react';
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
import { Status } from '../../../../../common/detection_engine/schemas/common/schemas';
import {
  ExceptionListItemSchema,
  CreateExceptionListItemSchema,
  ExceptionListType,
} from '../../../../../public/lists_plugin_deps';
import * as i18n from './translations';
import * as sharedI18n from '../translations';
import { TimelineNonEcsData, Ecs } from '../../../../graphql/types';
import { useAppToasts } from '../../../hooks/use_app_toasts';
import { useKibana } from '../../../lib/kibana';
import { ExceptionBuilderComponent } from '../builder';
import { Loader } from '../../loader';
import { useAddOrUpdateException } from '../use_add_exception';
import { useSignalIndex } from '../../../../detections/containers/detection_engine/alerts/use_signal_index';
import { useRuleAsync } from '../../../../detections/containers/detection_engine/rules/use_rule_async';
import { useFetchOrCreateRuleExceptionList } from '../use_fetch_or_create_rule_exception_list';
import { AddExceptionComments } from '../add_exception_comments';
import {
  enrichNewExceptionItemsWithComments,
  enrichExceptionItemsWithOS,
  lowercaseHashValues,
  defaultEndpointExceptionItems,
  entryHasListType,
  entryHasNonEcsType,
  getMappedNonEcsValue,
} from '../helpers';
import { ErrorInfo, ErrorCallout } from '../error_callout';
import { useFetchIndexPatterns } from '../../../../detections/containers/detection_engine/rules';

export interface AddExceptionModalBaseProps {
  ruleName: string;
  ruleId: string;
  exceptionListType: ExceptionListType;
  ruleIndices: string[];
  alertData?: {
    ecsData: Ecs;
    nonEcsData: TimelineNonEcsData[];
  };
}

export interface AddExceptionModalProps extends AddExceptionModalBaseProps {
  onCancel: () => void;
  onConfirm: (didCloseAlert: boolean) => void;
  onRuleChange?: () => void;
  alertStatus?: Status;
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

export const AddExceptionModal = memo(function AddExceptionModal({
  ruleName,
  ruleId,
  ruleIndices,
  exceptionListType,
  alertData,
  onCancel,
  onConfirm,
  onRuleChange,
  alertStatus,
}: AddExceptionModalProps) {
  const { http } = useKibana().services;
  const [comment, setComment] = useState('');
  const { rule: maybeRule } = useRuleAsync(ruleId);
  const [shouldCloseAlert, setShouldCloseAlert] = useState(false);
  const [shouldBulkCloseAlert, setShouldBulkCloseAlert] = useState(false);
  const [shouldDisableBulkClose, setShouldDisableBulkClose] = useState(false);
  const [exceptionItemsToAdd, setExceptionItemsToAdd] = useState<
    Array<ExceptionListItemSchema | CreateExceptionListItemSchema>
  >([]);
  const [fetchOrCreateListError, setFetchOrCreateListError] = useState<ErrorInfo | null>(null);
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
    (error: Error) => {
      addError(error, { title: i18n.ADD_EXCEPTION_ERROR });
      onCancel();
    },
    [addError, onCancel]
  );
  const onSuccess = useCallback(() => {
    addSuccess(i18n.ADD_EXCEPTION_SUCCESS);
    onConfirm(shouldCloseAlert);
  }, [addSuccess, onConfirm, shouldCloseAlert]);

  const [{ isLoading: addExceptionIsLoading }, addOrUpdateExceptionItems] = useAddOrUpdateException(
    {
      http,
      onSuccess,
      onError,
    }
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

  const handleRuleChange = useCallback(
    (ruleChanged: boolean): void => {
      if (ruleChanged && onRuleChange) {
        onRuleChange();
      }
    },
    [onRuleChange]
  );

  const handleDissasociationSuccess = useCallback(
    (id: string): void => {
      handleRuleChange(true);
      addSuccess(sharedI18n.DISSASOCIATE_LIST_SUCCESS(id));
      onCancel();
    },
    [handleRuleChange, addSuccess, onCancel]
  );

  const handleDissasociationError = useCallback(
    (error: Error): void => {
      addError(error, { title: sharedI18n.DISSASOCIATE_EXCEPTION_LIST_ERROR });
      onCancel();
    },
    [addError, onCancel]
  );

  const handleFetchOrCreateExceptionListError = useCallback(
    (error: Error, statusCode: number | null, message: string | null) => {
      setFetchOrCreateListError({
        reason: error.message,
        code: statusCode,
        details: message,
        listListId: null,
      });
    },
    [setFetchOrCreateListError]
  );

  const [isLoadingExceptionList, ruleExceptionList] = useFetchOrCreateRuleExceptionList({
    http,
    ruleId,
    exceptionListType,
    onError: handleFetchOrCreateExceptionListError,
    onSuccess: handleRuleChange,
  });

  const initialExceptionItems = useMemo(() => {
    if (exceptionListType === 'endpoint' && alertData !== undefined && ruleExceptionList) {
      return defaultEndpointExceptionItems(
        exceptionListType,
        ruleExceptionList.list_id,
        ruleName,
        alertData.nonEcsData
      );
    } else {
      return [];
    }
  }, [alertData, exceptionListType, ruleExceptionList, ruleName]);

  useEffect(() => {
    if (isSignalIndexPatternLoading === false && isSignalIndexLoading === false) {
      setShouldDisableBulkClose(
        entryHasListType(exceptionItemsToAdd) ||
          entryHasNonEcsType(exceptionItemsToAdd, signalIndexPatterns) ||
          exceptionItemsToAdd.every((item) => item.entries.length === 0)
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

  const onCommentChange = useCallback(
    (value: string) => {
      setComment(value);
    },
    [setComment]
  );

  const onCloseAlertCheckboxChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setShouldCloseAlert(event.currentTarget.checked);
    },
    [setShouldCloseAlert]
  );

  const onBulkCloseAlertCheckboxChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setShouldBulkCloseAlert(event.currentTarget.checked);
    },
    [setShouldBulkCloseAlert]
  );

  const retrieveAlertOsTypes = useCallback(() => {
    const osDefaults = ['windows', 'macos'];
    if (alertData) {
      const osTypes = getMappedNonEcsValue({
        data: alertData.nonEcsData,
        fieldName: 'host.os.family',
      });
      if (osTypes.length === 0) {
        return osDefaults;
      }
      return osTypes;
    }
    return osDefaults;
  }, [alertData]);

  const enrichExceptionItems = useCallback(() => {
    let enriched: Array<ExceptionListItemSchema | CreateExceptionListItemSchema> = [];
    enriched =
      comment !== ''
        ? enrichNewExceptionItemsWithComments(exceptionItemsToAdd, [{ comment }])
        : exceptionItemsToAdd;
    if (exceptionListType === 'endpoint') {
      const osTypes = retrieveAlertOsTypes();
      enriched = lowercaseHashValues(enrichExceptionItemsWithOS(enriched, osTypes));
    }
    return enriched;
  }, [comment, exceptionItemsToAdd, exceptionListType, retrieveAlertOsTypes]);

  const onAddExceptionConfirm = useCallback(() => {
    if (addOrUpdateExceptionItems !== null) {
      const alertIdToClose = shouldCloseAlert && alertData ? alertData.ecsData._id : undefined;
      const bulkCloseIndex =
        shouldBulkCloseAlert && signalIndexName !== null ? [signalIndexName] : undefined;
      addOrUpdateExceptionItems(enrichExceptionItems(), alertIdToClose, bulkCloseIndex);
    }
  }, [
    addOrUpdateExceptionItems,
    enrichExceptionItems,
    shouldCloseAlert,
    shouldBulkCloseAlert,
    alertData,
    signalIndexName,
  ]);

  const isSubmitButtonDisabled = useMemo(
    () =>
      fetchOrCreateListError != null ||
      exceptionItemsToAdd.every((item) => item.entries.length === 0),
    [fetchOrCreateListError, exceptionItemsToAdd]
  );

  return (
    <EuiOverlayMask onClick={onCancel}>
      <Modal onClose={onCancel} data-test-subj="add-exception-modal">
        <ModalHeader>
          <EuiModalHeaderTitle>
            {exceptionListType === 'endpoint' ? i18n.ADD_ENDPOINT_EXCEPTION : i18n.ADD_EXCEPTION}
          </EuiModalHeaderTitle>
          <ModalHeaderSubtitle className="eui-textTruncate" title={ruleName}>
            {ruleName}
          </ModalHeaderSubtitle>
        </ModalHeader>

        {fetchOrCreateListError != null && (
          <EuiModalFooter>
            <ErrorCallout
              http={http}
              errorInfo={fetchOrCreateListError}
              rule={maybeRule}
              onCancel={onCancel}
              onSuccess={handleDissasociationSuccess}
              onError={handleDissasociationError}
              data-test-subj="addExceptionModalErrorCallout"
            />
          </EuiModalFooter>
        )}
        {fetchOrCreateListError == null &&
          (isLoadingExceptionList ||
            isIndexPatternLoading ||
            isSignalIndexLoading ||
            isSignalIndexPatternLoading) && (
            <Loader data-test-subj="loadingAddExceptionModal" size="xl" />
          )}
        {fetchOrCreateListError == null &&
          !isSignalIndexLoading &&
          !isSignalIndexPatternLoading &&
          !isLoadingExceptionList &&
          !isIndexPatternLoading &&
          ruleExceptionList && (
            <>
              <ModalBodySection className="builder-section">
                <EuiText>{i18n.EXCEPTION_BUILDER_INFO}</EuiText>
                <EuiSpacer />
                <ExceptionBuilderComponent
                  exceptionListItems={initialExceptionItems}
                  listType={exceptionListType}
                  listId={ruleExceptionList.list_id}
                  listNamespaceType={ruleExceptionList.namespace_type}
                  ruleName={ruleName}
                  indexPatterns={indexPatterns}
                  isOrDisabled={false}
                  isAndDisabled={false}
                  isNestedDisabled={false}
                  data-test-subj="alert-exception-builder"
                  id-aria="alert-exception-builder"
                  onChange={handleBuilderOnChange}
                />

                <EuiSpacer />

                <AddExceptionComments
                  newCommentValue={comment}
                  newCommentOnChange={onCommentChange}
                />
              </ModalBodySection>
              <EuiHorizontalRule />
              <ModalBodySection>
                {alertData !== undefined && alertStatus !== 'closed' && (
                  <EuiFormRow fullWidth>
                    <EuiCheckbox
                      data-test-subj="close-alert-on-add-add-exception-checkbox"
                      id="close-alert-on-add-add-exception-checkbox"
                      label="Close this alert"
                      checked={shouldCloseAlert}
                      onChange={onCloseAlertCheckboxChange}
                    />
                  </EuiFormRow>
                )}
                <EuiFormRow fullWidth>
                  <EuiCheckbox
                    data-test-subj="bulk-close-alert-on-add-add-exception-checkbox"
                    id="bulk-close-alert-on-add-add-exception-checkbox"
                    label={
                      shouldDisableBulkClose
                        ? i18n.BULK_CLOSE_LABEL_DISABLED
                        : i18n.BULK_CLOSE_LABEL
                    }
                    checked={shouldBulkCloseAlert}
                    onChange={onBulkCloseAlertCheckboxChange}
                    disabled={shouldDisableBulkClose}
                  />
                </EuiFormRow>
                {exceptionListType === 'endpoint' && (
                  <>
                    <EuiSpacer />
                    <EuiText data-test-subj="add-exception-endpoint-text" color="subdued" size="s">
                      {i18n.ENDPOINT_QUARANTINE_TEXT}
                    </EuiText>
                  </>
                )}
              </ModalBodySection>
            </>
          )}
        {fetchOrCreateListError == null && (
          <EuiModalFooter>
            <EuiButtonEmpty onClick={onCancel}>{i18n.CANCEL}</EuiButtonEmpty>

            <EuiButton
              data-test-subj="add-exception-confirm-button"
              onClick={onAddExceptionConfirm}
              isLoading={addExceptionIsLoading}
              isDisabled={isSubmitButtonDisabled}
              fill
            >
              {i18n.ADD_EXCEPTION}
            </EuiButton>
          </EuiModalFooter>
        )}
      </Modal>
    </EuiOverlayMask>
  );
});
