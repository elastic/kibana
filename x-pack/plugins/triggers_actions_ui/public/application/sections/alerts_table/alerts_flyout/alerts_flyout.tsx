/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPagination,
  EuiProgress,
  EuiLoadingContent,
} from '@elastic/eui';
import type { EcsFieldsResponse } from '@kbn/rule-registry-plugin/common/search_strategy';
import { AlertsField } from '../../../../types';

const SAMPLE_TITLE_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.alertsTable.alertsFlyout.sampleTitle',
  {
    defaultMessage: 'Sample title',
  }
);

const NAME_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.alertsTable.alertsFlyout.name',
  {
    defaultMessage: 'Name',
  }
);

const REASON_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.alertsTable.alertsFlyout.reason',
  {
    defaultMessage: 'Reason',
  }
);

const PAGINATION_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.alertsTable.alertsFlyout.paginationLabel',
  {
    defaultMessage: 'Alert navigation',
  }
);

interface AlertsFlyoutProps {
  alert: EcsFieldsResponse;
  flyoutIndex: number;
  alertsCount: number;
  isLoading: boolean;
  onClose: () => void;
  onPaginate: (pageIndex: number) => void;
}
export const AlertsFlyout: React.FunctionComponent<AlertsFlyoutProps> = ({
  alert,
  flyoutIndex,
  alertsCount,
  isLoading,
  onClose,
  onPaginate,
}: AlertsFlyoutProps) => {
  return (
    <EuiFlyout onClose={onClose} size="s" data-test-subj="alertsFlyout">
      {isLoading && <EuiProgress size="xs" color="accent" data-test-subj="alertsFlyoutLoading" />}
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{SAMPLE_TITLE_LABEL}</h2>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="none" justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiPagination
              aria-label={PAGINATION_LABEL}
              pageCount={alertsCount}
              activePage={flyoutIndex}
              onPageClick={onPaginate}
              compressed
              data-test-subj="alertsFlyoutPagination"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween" direction="column">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h4>{NAME_LABEL}</h4>
            </EuiTitle>
            <EuiSpacer size="s" />
            {isLoading ? (
              <EuiLoadingContent lines={1} />
            ) : (
              <EuiText size="s" data-test-subj="alertsFlyoutName">
                {/* any is required here to improve typescript performance */}
                {get(alert as any, AlertsField.name, [])[0] as string}
              </EuiText>
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h4>{REASON_LABEL}</h4>
            </EuiTitle>
            <EuiSpacer size="s" />
            {isLoading ? (
              <EuiLoadingContent lines={3} />
            ) : (
              <EuiText size="s" data-test-subj="alertsFlyoutReason">
                {/* any is required here to improve typescript performance */}
                {get(alert as any, AlertsField.reason, [])[0] as string}
              </EuiText>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiHorizontalRule size="full" />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
