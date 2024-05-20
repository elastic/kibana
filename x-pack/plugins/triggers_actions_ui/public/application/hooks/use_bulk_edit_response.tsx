/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { useKibana } from '../../common/lib/kibana';
import { BulkEditResponse } from '../../types';

const successMessage = (total: number, property: string) =>
  i18n.translate('xpack.triggersActionsUI.sections.ruleApi.bulkEditResponse.success', {
    defaultMessage: 'Updated {property} for {total, plural, one {# rule} other {# rules}}.',
    values: { total, property },
  });

const someSuccessMessage = (success: number, failure: number, property: string) =>
  i18n.translate('xpack.triggersActionsUI.sections.ruleApi.bulkEditResponse.someSuccess', {
    defaultMessage:
      'Updated {property} for {success, plural, one {# rule} other {# rules}}, {failure, plural, one {# rule} other {# rules}} encountered errors.',
    values: { success, failure, property },
  });

const failureMessage = (failure: number, property: string) =>
  i18n.translate('xpack.triggersActionsUI.sections.ruleApi.bulkEditResponse.failure', {
    defaultMessage:
      'Failed to update {property} for {failure, plural, one {# rule} other {# rules}}.',
    values: { failure, property },
  });

const snooze = i18n.translate(
  'xpack.triggersActionsUI.sections.ruleApi.bulkEditResponse.property.snoozeSettings',
  {
    defaultMessage: 'snooze settings',
  }
);

const snoozeSchedule = snooze;

const apiKey = i18n.translate(
  'xpack.triggersActionsUI.sections.ruleApi.bulkEditResponse.property.apiKey',
  {
    defaultMessage: 'API key',
  }
);

export type BulkEditProperty = 'snooze' | 'snoozeSchedule' | 'apiKey';

const translationMap: Record<BulkEditProperty, string> = {
  snooze,
  snoozeSchedule,
  apiKey,
};

export interface UseBulkEditResponseProps {
  onSearchPopulate?: (filter: string) => void;
}

export function useBulkEditResponse(props: UseBulkEditResponseProps) {
  const { onSearchPopulate } = props;
  const {
    i18n: i18nStart,
    theme,
    notifications: { toasts },
  } = useKibana().services;

  const onSearchPopulateInternal = useCallback(
    (response: BulkEditResponse) => {
      if (!onSearchPopulate) {
        return;
      }
      const filter = response.errors.map((error) => error.rule.name).join(',');
      onSearchPopulate(filter);
    },
    [onSearchPopulate]
  );

  const renderToastErrorBody = useCallback(
    (response: BulkEditResponse) => {
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
    (response: BulkEditResponse, property: BulkEditProperty) => {
      const { errors, total } = response;

      const numberOfSuccess = total - errors.length;
      const numberOfErrors = errors.length;

      // All success
      if (!numberOfErrors) {
        toasts.addSuccess(successMessage(numberOfSuccess, translationMap[property]));
        return;
      }

      // All failure
      if (numberOfErrors === total) {
        toasts.addDanger({
          title: failureMessage(numberOfErrors, translationMap[property]),
          text: toMountPoint(renderToastErrorBody(response), { i18n: i18nStart, theme }),
        });
        return;
      }

      // Some failure
      toasts.addWarning({
        title: someSuccessMessage(numberOfSuccess, numberOfErrors, translationMap[property]),
        text: toMountPoint(renderToastErrorBody(response), { i18n: i18nStart, theme }),
      });
    },
    [i18nStart, theme, toasts, renderToastErrorBody]
  );

  return useMemo(() => {
    return {
      showToast,
    };
  }, [showToast]);
}
