/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton, EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { SelectDashboard } from './select_dashboard_modal';

export function LinkDashboard({
  isModalVisible,
  setIsModalVisible,
  onRefresh,
  emptyButton = false,
}: {
  isModalVisible: boolean;
  setIsModalVisible: (isVisible: boolean) => void;
  onRefresh: () => void;
  emptyButton?: Boolean;
}) {
  return (
    <>
      {emptyButton ? (
        <EuiButtonEmpty
          color="text"
          size="s"
          iconType={'plusInCircle'}
          data-test-subj="apmLinkServiceDashboardMenu"
          onClick={() => setIsModalVisible(true)}
        >
          {i18n.translate('xpack.apm.serviceDashboards.linkEmptyButtonLabel', {
            defaultMessage: 'Link new dashboard',
          })}
        </EuiButtonEmpty>
      ) : (
        <EuiButton
          data-test-subj="apmAddServiceDashboard"
          onClick={() => setIsModalVisible(true)}
        >
          {i18n.translate('xpack.apm.serviceDashboards.linkButtonLabel', {
            defaultMessage: 'Link dashboard',
          })}
        </EuiButton>
      )}

      {isModalVisible && (
        <SelectDashboard
          onClose={() => setIsModalVisible(false)}
          onRefresh={onRefresh}
        />
      )}
    </>
  );
}
