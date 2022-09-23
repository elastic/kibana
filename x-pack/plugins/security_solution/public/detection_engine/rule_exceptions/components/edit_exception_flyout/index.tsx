/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Component being re-implemented in 8.5

/* eslint-disable complexity */

import React, { memo, useState, useCallback, useEffect, useMemo, useReducer } from 'react';
import styled, { css } from 'styled-components';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiHorizontalRule,
  EuiCheckbox,
  EuiSpacer,
  EuiFormRow,
  EuiText,
  EuiCallOut,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlexGroup,
  EuiTitle,
  EuiFlyout,
  EuiFlyoutFooter,
} from '@elastic/eui';

import type {
  ExceptionListSchema,
  ExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import {
  ExceptionListType,
  OsTypeArray,
  OsType,
  CreateExceptionListItemSchema,
  ExceptionListTypeEnum,
} from '@kbn/securitysolution-io-ts-list-types';

import * as i18n from './translations';
import { ExceptionsFlyoutMeta } from '../flyout_components/item_meta_form';
import { createExceptionItemsReducer } from './reducer';
import { ExceptionsLinkedToLists } from '../flyout_components/linked_to_list';
import { ExceptionsLinkedToRule } from '../flyout_components/linked_to_rule';
import type { Rule } from '../../../../detections/containers/detection_engine/rules/types';
import { ExceptionsFlyoutComments } from '../flyout_components/item_comments';
import { ExceptionItemsFlyoutAlertsActions } from '../flyout_components/alerts_actions';

interface EditExceptionFlyoutProps {
  list: ExceptionListSchema;
  itemToEdit: ExceptionListItemSchema;
  showAlertCloseOptions: boolean;
  rule?: Rule;
  onCancel: (arg: boolean) => void;
}

const FlyoutHeader = styled(EuiFlyoutHeader)`
  ${({ theme }) => css`
    border-bottom: 1px solid ${theme.eui.euiColorLightShade};
  `}
`;

const FlyoutBodySection = styled(EuiFlyoutBody)`
  ${() => css`
    &.builder-section {
      overflow-y: scroll;
    }
  `}
`;

const EditExceptionFlyoutComponent: React.FC<EditExceptionFlyoutProps> = ({
  list,
  itemToEdit,
  rule,
  showAlertCloseOptions,
  onCancel,
}): JSX.Element => {
  const [
    {
      exceptionItems,
      exceptionItemMeta: { name: exceptionItemName },
      newComment,
      bulkCloseAlerts,
      disableBulkClose,
    },
    dispatch,
  ] = useReducer(createExceptionItemsReducer(), {
    exceptionItems: [itemToEdit],
    exceptionItemMeta: { name: itemToEdit.name },
    newComment: '',
    bulkCloseAlerts: false,
    disableBulkClose: true,
    bulkCloseIndex: undefined,
  });

  const setExceptionItemMeta = useCallback(
    (value: [string, string]): void => {
      dispatch({
        type: 'setExceptionItemMeta',
        value,
      });
    },
    [dispatch]
  );

  const setComment = useCallback(
    (comment: string): void => {
      dispatch({
        type: 'setComment',
        comment,
      });
    },
    [dispatch]
  );

  const setBulkCloseAlerts = useCallback(
    (bulkClose: boolean): void => {
      dispatch({
        type: 'setBulkCloseAlerts',
        bulkClose,
      });
    },
    [dispatch]
  );

  const setDisableBulkCloseAlerts = useCallback(
    (disableBulkCloseAlerts: boolean): void => {
      dispatch({
        type: 'setDisableBulkCloseAlerts',
        disableBulkCloseAlerts,
      });
    },
    [dispatch]
  );

  const setBulkCloseIndex = useCallback(
    (index: string[] | undefined): void => {
      dispatch({
        type: 'setBulkCloseIndex',
        bulkCloseIndex: index,
      });
    },
    [dispatch]
  );

  const handleCloseFlyout = useCallback((): void => {
    onCancel(false);
  }, [onCancel]);

  const editExceptionMessage = useMemo(
    () =>
      list.type === ExceptionListTypeEnum.ENDPOINT
        ? i18n.EDIT_ENDPOINT_EXCEPTION_TITLE
        : i18n.EDIT_EXCEPTION_TITLE,
    [list.type]
  );

  return (
    <EuiFlyout size="l" onClose={handleCloseFlyout} data-test-subj="editExceptionFlyout">
      <FlyoutHeader>
        <EuiTitle>
          <h2 data-test-subj="exceptionFlyoutTitle">{editExceptionMessage}</h2>
        </EuiTitle>
        <EuiSpacer size="m" />
      </FlyoutHeader>
      <FlyoutBodySection className="builder-section">
        <ExceptionsFlyoutMeta
          exceptionItemName={exceptionItemName}
          onChange={setExceptionItemMeta}
        />
        {list.type === ExceptionListTypeEnum.DETECTION && (
          <>
            <EuiHorizontalRule />
            <ExceptionsLinkedToLists list={list} />
          </>
        )}
        {list.type === ExceptionListTypeEnum.RULE_DEFAULT && rule != null && (
          <>
            <EuiHorizontalRule />
            <ExceptionsLinkedToRule rule={rule} />
          </>
        )}
        <EuiHorizontalRule />
        <ExceptionsFlyoutComments
          existingComments={itemToEdit.comments}
          newComment={newComment}
          onCommentChange={setComment}
        />
        {showAlertCloseOptions && (
          <>
            <EuiHorizontalRule />
            <ExceptionItemsFlyoutAlertsActions
              exceptionListType={list.type}
              shouldBulkCloseAlert={bulkCloseAlerts}
              disableBulkClose={disableBulkClose}
              exceptionListItems={exceptionItems}
              onDisableBulkClose={setDisableBulkCloseAlerts}
              onUpdateBulkCloseIndex={setBulkCloseIndex}
              onBulkCloseCheckboxChange={setBulkCloseAlerts}
            />
          </>
        )}
      </FlyoutBodySection>
    </EuiFlyout>
  );
};

export const EditExceptionFlyout = React.memo(EditExceptionFlyoutComponent);

EditExceptionFlyout.displayName = 'EditExceptionFlyout';
