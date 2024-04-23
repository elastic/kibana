/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { BulkOperationError } from '@kbn/alerting-plugin/server';
import { useKibana } from '../../common/lib/kibana';
import {
  getSuccessfulDeletionNotificationText,
  getFailedDeletionNotificationText,
  getPartialSuccessDeletionNotificationText,
  getPartialSuccessEnablingNotificationText,
  getPartialSuccessDisablingNotificationText,
  getFailedEnablingNotificationText,
  getFailedDisablingNotificationText,
  getSuccessfulEnablingNotificationText,
  getSuccessfulDisablingNotificationText,
  SINGLE_RULE_TITLE,
  MULTIPLE_RULE_TITLE,
} from '../sections/rules_list/translations';

const actionToToastMapping = {
  DELETE: {
    getSuccessfulNotificationText: getSuccessfulDeletionNotificationText,
    getFailedNotificationText: getFailedDeletionNotificationText,
    getPartialSuccessNotificationText: getPartialSuccessDeletionNotificationText,
  },
  ENABLE: {
    getSuccessfulNotificationText: getSuccessfulEnablingNotificationText,
    getFailedNotificationText: getFailedEnablingNotificationText,
    getPartialSuccessNotificationText: getPartialSuccessEnablingNotificationText,
  },
  DISABLE: {
    getSuccessfulNotificationText: getSuccessfulDisablingNotificationText,
    getFailedNotificationText: getFailedDisablingNotificationText,
    getPartialSuccessNotificationText: getPartialSuccessDisablingNotificationText,
  },
};

export const useBulkOperationToast = ({
  onSearchPopulate,
}: {
  onSearchPopulate?: (filter: string) => void;
}) => {
  const {
    i18n,
    theme,
    notifications: { toasts },
  } = useKibana().services;

  const onSearchPopulateInternal = useCallback(
    (errors: BulkOperationError[]) => {
      if (!onSearchPopulate) {
        return;
      }
      const filter = errors.map((error) => error.rule.name).join(',');
      onSearchPopulate(filter);
    },
    [onSearchPopulate]
  );

  const renderToastErrorBody = useCallback(
    (errors: BulkOperationError[], messageType: 'warning' | 'danger') => {
      return (
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="xs">
          {onSearchPopulate && (
            <EuiFlexItem grow={false}>
              <EuiButton
                color={messageType}
                size="s"
                onClick={() => onSearchPopulateInternal(errors)}
                data-test-subj="bulkDeleteResponseFilterErrors"
              >
                <FormattedMessage
                  id="xpack.triggersActionsUI.sections.ruleApi.bulkEditResponse.filterByErrors"
                  defaultMessage="Filter by errored rules"
                />
              </EuiButton>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      );
    },
    [onSearchPopulate, onSearchPopulateInternal]
  );

  const showToast = useCallback(
    ({
      action,
      errors,
      total,
    }: {
      action: 'DELETE' | 'ENABLE' | 'DISABLE';
      errors: BulkOperationError[];
      total: number;
    }) => {
      const numberOfSuccess = total - errors.length;
      const numberOfErrors = errors.length;

      // All success
      if (!numberOfErrors) {
        toasts.addSuccess(
          actionToToastMapping[action].getSuccessfulNotificationText(
            numberOfSuccess,
            SINGLE_RULE_TITLE,
            MULTIPLE_RULE_TITLE
          )
        );
        return;
      }

      // All failure
      if (numberOfErrors === total) {
        toasts.addDanger({
          title: actionToToastMapping[action].getFailedNotificationText(
            numberOfErrors,
            SINGLE_RULE_TITLE,
            MULTIPLE_RULE_TITLE
          ),
          text: toMountPoint(renderToastErrorBody(errors, 'danger'), { i18n, theme }),
        });
        return;
      }

      // Some failure
      toasts.addWarning({
        title: actionToToastMapping[action].getPartialSuccessNotificationText(
          numberOfSuccess,
          numberOfErrors,
          SINGLE_RULE_TITLE,
          MULTIPLE_RULE_TITLE
        ),
        text: toMountPoint(renderToastErrorBody(errors, 'warning'), { i18n, theme }),
      });
    },
    [i18n, theme, toasts, renderToastErrorBody]
  );

  return useMemo(() => {
    return {
      showToast,
    };
  }, [showToast]);
};
