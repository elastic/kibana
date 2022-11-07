/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { useKibana } from '../../common/lib/kibana';
import { BulkDeleteResponse } from '../../types';
import {
  getSuccessfulDeletionNotificationText,
  getFailedDeletionNotificationText,
  getPartialSuccessDeletionNotificationText,
  SINGLE_RULE_TITLE,
  MULTIPLE_RULE_TITLE,
} from '../sections/rules_list/translations';

export const useBulkDeleteResponse = ({
  onSearchPopulate,
}: {
  onSearchPopulate?: (filter: string) => void;
}) => {
  const {
    notifications: { toasts },
  } = useKibana().services;

  const onSearchPopulateInternal = useCallback(
    (response: BulkDeleteResponse) => {
      if (!onSearchPopulate) {
        return;
      }
      const filter = response.errors.map((error) => error.rule.name).join(',');
      onSearchPopulate(filter);
    },
    [onSearchPopulate]
  );

  const renderToastErrorBody = useCallback(
    (response: BulkDeleteResponse, messageType: 'warning' | 'danger') => {
      return (
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="xs">
          {onSearchPopulate && (
            <EuiFlexItem grow={false}>
              <EuiButton
                color={messageType}
                size="s"
                onClick={() => onSearchPopulateInternal(response)}
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
    (response: BulkDeleteResponse) => {
      const { errors, total } = response;

      const numberOfSuccess = total - errors.length;
      const numberOfErrors = errors.length;

      // All success
      if (!numberOfErrors) {
        toasts.addSuccess(
          getSuccessfulDeletionNotificationText(
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
          title: getFailedDeletionNotificationText(
            numberOfErrors,
            SINGLE_RULE_TITLE,
            MULTIPLE_RULE_TITLE
          ),
          text: toMountPoint(renderToastErrorBody(response, 'danger')),
        });
        return;
      }

      // Some failure
      toasts.addWarning({
        title: getPartialSuccessDeletionNotificationText(
          numberOfSuccess,
          numberOfErrors,
          SINGLE_RULE_TITLE,
          MULTIPLE_RULE_TITLE
        ),
        text: toMountPoint(renderToastErrorBody(response, 'warning')),
      });
    },
    [toasts, renderToastErrorBody]
  );

  return useMemo(() => {
    return {
      showToast,
    };
  }, [showToast]);
};
