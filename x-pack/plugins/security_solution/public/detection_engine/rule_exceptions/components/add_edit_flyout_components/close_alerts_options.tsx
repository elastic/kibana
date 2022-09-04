/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import styled, { css } from 'styled-components';

import { EuiTitle, EuiFormRow, EuiCheckbox, EuiSpacer, EuiText } from '@elastic/eui';
import type { ExceptionListType } from '@kbn/securitysolution-io-ts-list-types';
import type { ExceptionsBuilderExceptionItem } from '@kbn/securitysolution-list-utils';

import { useSignalIndex } from '../../../../detections/containers/detection_engine/alerts/use_signal_index';
import type { Status } from '../../../../../common/detection_engine/schemas/common/schemas';
import { useFetchIndex } from '../../../../common/containers/source';
import { entryHasListType, entryHasNonEcsType } from '../../utils/helpers';
import * as i18n from './translations';
import type { AlertData } from '../../utils/types';
import type { Action } from './reducer';

const FlyoutCheckboxesSection = styled.section`
  overflow-y: inherit;
  height: auto;
  .euiFlyoutBody__overflowContent {
    padding-top: 0;
  }
`;

const SectionHeader = styled(EuiTitle)`
  ${() => css`
    font-weight: ${({ theme }) => theme.eui.euiFontWeightSemiBold};
  `}
`;

interface ExceptionsFlyoutMetaComponentProps {
  exceptionListItems: ExceptionsBuilderExceptionItem[];
  exceptionListType: ExceptionListType;
  shouldCloseSingleAlert: boolean;
  shouldBulkCloseAlert: boolean;
  disableBulkClose: boolean;
  alertData: AlertData | undefined;
  alertStatus: Status | undefined;
  dispatch: React.Dispatch<Action>;
}

const ExceptionItemsFlyoutAlertOptionsComponent: React.FC<ExceptionsFlyoutMetaComponentProps> = ({
  exceptionListItems,
  exceptionListType,
  shouldCloseSingleAlert,
  shouldBulkCloseAlert,
  disableBulkClose,
  alertData,
  alertStatus,
  dispatch,
}): JSX.Element => {
  const { loading: isSignalIndexLoading, signalIndexName } = useSignalIndex();
  const memoSignalIndexName = useMemo(
    () => (signalIndexName !== null ? [signalIndexName] : []),
    [signalIndexName]
  );
  const [isSignalIndexPatternLoading, { indexPatterns: signalIndexPatterns }] =
    useFetchIndex(memoSignalIndexName);

  /**
   * Reducer action dispatchers
   * */
  const setBulkCloseIndex = useCallback(
    (bulkCloseIndex: string[] | undefined): void => {
      dispatch({
        type: 'setBulkCloseIndex',
        bulkCloseIndex,
      });
    },
    [dispatch]
  );

  const setCloseSingleAlert = useCallback(
    (close: boolean): void => {
      dispatch({
        type: 'setCloseSingleAlert',
        close,
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

  const handleBulkCloseCheckbox = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      setBulkCloseAlerts(event.currentTarget.checked);
    },
    [setBulkCloseAlerts]
  );

  const handleCloseSingleAlertCheckbox = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      setCloseSingleAlert(event.currentTarget.checked);
    },
    [setCloseSingleAlert]
  );

  useEffect(() => {
    setBulkCloseIndex(
      shouldBulkCloseAlert && memoSignalIndexName != null ? memoSignalIndexName : undefined
    );
  }, [memoSignalIndexName, setBulkCloseIndex, shouldBulkCloseAlert]);

  useEffect((): void => {
    if (disableBulkClose === true) {
      setBulkCloseAlerts(false);
    }
  }, [disableBulkClose, setBulkCloseAlerts]);

  useEffect((): void => {
    if (isSignalIndexPatternLoading === false && isSignalIndexLoading === false) {
      setDisableBulkCloseAlerts(
        entryHasListType(exceptionListItems) ||
          entryHasNonEcsType(exceptionListItems, signalIndexPatterns) ||
          exceptionListItems.every((item) => item.entries.length === 0)
      );
    }
  }, [
    setDisableBulkCloseAlerts,
    exceptionListItems,
    isSignalIndexPatternLoading,
    isSignalIndexLoading,
    signalIndexPatterns,
  ]);

  return (
    <FlyoutCheckboxesSection>
      <SectionHeader size="xs">
        <h3>{i18n.CLOSE_ALERTS_SECTION_TITLE}</h3>
      </SectionHeader>
      <EuiSpacer size="s" />
      {alertData != null && alertStatus !== 'closed' && (
        <EuiFormRow fullWidth>
          <EuiCheckbox
            data-test-subj="close-alert-on-add-add-exception-checkbox"
            id="close-alert-on-add-add-exception-checkbox"
            label="Close this alert"
            checked={shouldCloseSingleAlert}
            onChange={handleCloseSingleAlertCheckbox}
            disabled={isSignalIndexLoading || isSignalIndexPatternLoading}
          />
        </EuiFormRow>
      )}
      <EuiFormRow fullWidth>
        <EuiCheckbox
          data-test-subj="bulk-close-alert-on-add-add-exception-checkbox"
          id="bulk-close-alert-on-add-add-exception-checkbox"
          label={disableBulkClose ? i18n.BULK_CLOSE_LABEL_DISABLED : i18n.BULK_CLOSE_LABEL}
          checked={shouldBulkCloseAlert}
          onChange={handleBulkCloseCheckbox}
          disabled={disableBulkClose || isSignalIndexLoading || isSignalIndexPatternLoading}
        />
      </EuiFormRow>
      {exceptionListType === 'endpoint' && (
        <>
          <EuiSpacer size="s" />
          <EuiText data-test-subj="add-exception-endpoint-text" color="subdued" size="s">
            {i18n.ENDPOINT_QUARANTINE_TEXT}
          </EuiText>
        </>
      )}
    </FlyoutCheckboxesSection>
  );
};

export const ExceptionItemsFlyoutAlertOptions = React.memo(
  ExceptionItemsFlyoutAlertOptionsComponent
);

ExceptionItemsFlyoutAlertOptions.displayName = 'ExceptionItemsFlyoutAlertOptions';
