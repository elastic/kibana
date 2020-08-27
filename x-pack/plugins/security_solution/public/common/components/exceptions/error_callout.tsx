/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useEffect, useState, useCallback } from 'react';
import {
  EuiButtonEmpty,
  EuiAccordion,
  EuiCodeBlock,
  EuiButton,
  EuiCallOut,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';

import { HttpSetup } from '../../../../../../../src/core/public';
import { List } from '../../../../common/detection_engine/schemas/types/lists';
import { Rule } from '../../../detections/containers/detection_engine/rules/types';
import * as i18n from './translations';
import { useDissasociateExceptionList } from '../../../detections/containers/detection_engine/rules/use_dissasociate_exception_list';

export interface ErrorInfo {
  reason: string | null;
  code: number | null;
  details: string | null;
  listListId: string | null;
}

export interface ErrorCalloutProps {
  http: HttpSetup;
  rule: Rule | null;
  errorInfo: ErrorInfo;
  onCancel: () => void;
  onSuccess: (listId: string) => void;
  onError: (arg: Error) => void;
}

const ErrorCalloutComponent = ({
  http,
  rule,
  errorInfo,
  onCancel,
  onError,
  onSuccess,
}: ErrorCalloutProps): JSX.Element => {
  const [listToDelete, setListToDelete] = useState<List | null>(null);
  const [errorTitle, setErrorTitle] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>(i18n.ADD_EXCEPTION_FETCH_ERROR);

  const handleOnSuccess = useCallback((): void => {
    onSuccess(listToDelete != null ? listToDelete.id : '');
  }, [onSuccess, listToDelete]);

  const [isDissasociatingList, handleDissasociateExceptionList] = useDissasociateExceptionList({
    http,
    ruleRuleId: rule != null ? rule.rule_id : '',
    onSuccess: handleOnSuccess,
    onError,
  });

  const canDisplay404Actions = useMemo(
    (): boolean =>
      errorInfo.code === 404 &&
      rule != null &&
      listToDelete != null &&
      handleDissasociateExceptionList != null,
    [errorInfo.code, listToDelete, handleDissasociateExceptionList, rule]
  );

  useEffect((): void => {
    // Yes, it's redundant, unfortunately typescript wasn't picking up
    // that `listToDelete` is checked in canDisplay404Actions
    if (canDisplay404Actions && listToDelete != null) {
      setErrorMessage(i18n.ADD_EXCEPTION_FETCH_404_ERROR(listToDelete.id));
    }

    setErrorTitle(`${errorInfo.reason}${errorInfo.code != null ? ` (${errorInfo.code})` : ''}`);
  }, [errorInfo.reason, errorInfo.code, listToDelete, canDisplay404Actions]);

  const handleDissasociateList = useCallback((): void => {
    // Yes, it's redundant, unfortunately typescript wasn't picking up
    // that `handleDissasociateExceptionList` and `list` are checked in
    // canDisplay404Actions
    if (
      canDisplay404Actions &&
      rule != null &&
      listToDelete != null &&
      handleDissasociateExceptionList != null
    ) {
      const exceptionLists = (rule.exceptions_list ?? []).filter(
        ({ id }) => id !== listToDelete.id
      );

      handleDissasociateExceptionList(exceptionLists);
    }
  }, [handleDissasociateExceptionList, listToDelete, canDisplay404Actions, rule]);

  useEffect((): void => {
    if (errorInfo.code === 404 && rule != null && rule.exceptions_list != null) {
      const [listFound] = rule.exceptions_list.filter(
        ({ id, list_id: listId }) =>
          (errorInfo.details != null && errorInfo.details.includes(id)) ||
          errorInfo.listListId === listId
      );
      setListToDelete(listFound);
    }
  }, [rule, errorInfo.details, errorInfo.code, errorInfo.listListId]);

  return (
    <EuiCallOut
      data-test-subj="errorCalloutContainer"
      title={`${i18n.ERROR}: ${errorTitle}`}
      color="danger"
      iconType="alert"
    >
      <EuiText size="s">
        <p data-test-subj="errorCalloutMessage">{errorMessage}</p>
      </EuiText>
      <EuiSpacer />
      {listToDelete != null && (
        <EuiAccordion
          id="accordion1"
          buttonContent={
            <EuiText size="s">
              <p>{i18n.MODAL_ERROR_ACCORDION_TEXT}</p>
            </EuiText>
          }
        >
          <EuiCodeBlock
            language="json"
            fontSize="s"
            paddingSize="m"
            overflowHeight={300}
            isCopyable
          >
            {JSON.stringify(listToDelete)}
          </EuiCodeBlock>
        </EuiAccordion>
      )}
      <EuiSpacer />
      <EuiButtonEmpty
        data-test-subj="errorCalloutCancelButton"
        color="danger"
        isDisabled={isDissasociatingList}
        onClick={onCancel}
      >
        {i18n.CANCEL}
      </EuiButtonEmpty>
      {canDisplay404Actions && (
        <EuiButton
          data-test-subj="errorCalloutDissasociateButton"
          isLoading={isDissasociatingList}
          onClick={handleDissasociateList}
          color="danger"
        >
          {i18n.CLEAR_EXCEPTIONS_LABEL}
        </EuiButton>
      )}
    </EuiCallOut>
  );
};

ErrorCalloutComponent.displayName = 'ErrorCalloutComponent';

export const ErrorCallout = React.memo(ErrorCalloutComponent);

ErrorCallout.displayName = 'ErrorCallout';
