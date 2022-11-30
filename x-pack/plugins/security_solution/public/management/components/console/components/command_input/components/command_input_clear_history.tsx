/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
import { EuiButtonEmpty, EuiConfirmModal, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useConsoleStateDispatch } from '../../../hooks/state_selectors/use_console_state_dispatch';

export const CommandInputClearHistory = memo(() => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const dispatch = useConsoleStateDispatch();

  const handleClearInputHistory = useCallback(() => {
    setShowConfirmModal(true);
  }, []);

  const handleConfirmModalCancel = useCallback(() => {
    setShowConfirmModal(false);
  }, []);

  const handleConfirmModalConfirm = useCallback(() => {
    dispatch({ type: 'clearInputHistoryState' });
    setShowConfirmModal(false);
  }, [dispatch]);

  return (
    <>
      {showConfirmModal && (
        <EuiConfirmModal
          title={i18n.translate('xpack.securitySolution.commandInputClearHistory.title', {
            defaultMessage: 'Clear input history',
          })}
          cancelButtonText={i18n.translate(
            'xpack.securitySolution.commandInputClearHistory.cancelButton',
            { defaultMessage: 'Cancel' }
          )}
          confirmButtonText={i18n.translate(
            'xpack.securitySolution.commandInputClearHistory.confirmButton',
            { defaultMessage: 'Clear' }
          )}
          buttonColor="danger"
          onCancel={handleConfirmModalCancel}
          onConfirm={handleConfirmModalConfirm}
        >
          {'This action cannot be undone. Are you sure you wish to continue?'}
        </EuiConfirmModal>
      )}

      <EuiFlexGroup responsive={false} justifyContent="flexEnd" gutterSize="none">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            tabIndex={-1}
            onClick={handleClearInputHistory}
            disabled={showConfirmModal}
          >
            <FormattedMessage
              id="xpack.securitySolution.commandInputHistory.clearHistoryButtonLabel"
              defaultMessage="Clear input history"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
});
CommandInputClearHistory.displayName = 'CommandInputClearHistory';
