/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { useKibana } from '../../common/lib/kibana';
import { BulkDeleteResponse } from '../../types';
import {
  getFailedNotificationText,
  getSuccessfulNotificationText,
  getPartialSuccessNotificationText,
  singleRuleTitle,
  multipleRuleTitle,
} from '../components/translations';

export const useBulkDeleteResponse = (props: { onSearchPopulate?: (filter: string) => void }) => {
  const { onSearchPopulate } = props;
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
    (response: BulkDeleteResponse) => {
      return (
        <EuiFlexGroup direction="column" gutterSize="xs">
          {onSearchPopulate && (
            <EuiFlexItem grow={false}>
              <div>
                <EuiButtonEmpty
                  iconType="search"
                  size="xs"
                  flush="left"
                  onClick={() => onSearchPopulateInternal(response)}
                  data-test-subj="bulkEditResponseFilterErrors"
                >
                  <FormattedMessage
                    id="xpack.triggersActionsUI.sections.ruleApi.bulkEditResponse.filterByErrors"
                    defaultMessage="Filter by errored rules"
                  />
                </EuiButtonEmpty>
              </div>
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
          getSuccessfulNotificationText(numberOfSuccess, singleRuleTitle, multipleRuleTitle)
        );
        return;
      }

      // All failure
      if (numberOfErrors === total) {
        toasts.addDanger({
          title: getFailedNotificationText(numberOfErrors, singleRuleTitle, multipleRuleTitle),
          text: toMountPoint(renderToastErrorBody(response)),
        });
        return;
      }

      // Some failure
      toasts.addWarning({
        title: getPartialSuccessNotificationText(
          numberOfSuccess,
          numberOfErrors,
          singleRuleTitle,
          multipleRuleTitle
        ),
        text: toMountPoint(renderToastErrorBody(response)),
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
