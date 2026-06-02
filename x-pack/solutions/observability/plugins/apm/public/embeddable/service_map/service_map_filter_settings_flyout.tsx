/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiSwitch,
  EuiTitle,
} from '@elastic/eui';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

export interface ServiceMapFilterSettingsFlyoutProps {
  ariaLabelledBy: string;
  /** Current value of `sync_with_dashboard_filters` (default false). */
  initialSyncWithDashboardFilters: boolean;
  onCancel: () => void;
  onSave: (syncWithDashboardFilters: boolean) => void;
}

/**
 * Panel-level "filter settings" flyout for a service map dashboard panel. Holds the
 * "Sync with dashboard filters" toggle. Time-range customization is handled separately by
 * Kibana's built-in "Customize time range" panel-menu action / panel Settings flyout.
 */
export function ServiceMapFilterSettingsFlyout({
  ariaLabelledBy,
  initialSyncWithDashboardFilters,
  onCancel,
  onSave,
}: ServiceMapFilterSettingsFlyoutProps) {
  const [syncWithDashboardFilters, setSyncWithDashboardFilters] = useState<boolean>(
    initialSyncWithDashboardFilters
  );

  return (
    <>
      <EuiFlyoutHeader hasBorder data-test-subj="apmServiceMapFilterSettingsFlyout">
        <EuiTitle size="s">
          <h2 id={ariaLabelledBy}>
            <FormattedMessage
              id="xpack.apm.serviceMapFilterSettings.title"
              defaultMessage="Service map filter settings"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm fullWidth>
          <EuiFormRow
            helpText={i18n.translate('xpack.apm.serviceMapFilterSettings.syncFiltersHelpText', {
              defaultMessage:
                "When on, the panel also responds to the dashboard's global filters / KQL / Controls. When off, the panel uses only its own filters.",
            })}
            fullWidth
          >
            <EuiSwitch
              label={i18n.translate('xpack.apm.serviceMapFilterSettings.syncFiltersLabel', {
                defaultMessage: 'Sync with dashboard filters',
              })}
              checked={syncWithDashboardFilters}
              onChange={(e) => setSyncWithDashboardFilters(e.target.checked)}
              data-test-subj="apmServiceMapFilterSettingsSyncFiltersToggle"
            />
          </EuiFormRow>
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={onCancel}
              color="primary"
              size="m"
              flush="left"
              data-test-subj="apmServiceMapFilterSettingsCancelButton"
            >
              <FormattedMessage
                id="xpack.apm.serviceMapFilterSettings.cancelButton"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={() => onSave(syncWithDashboardFilters)}
              fill
              color="primary"
              size="m"
              data-test-subj="apmServiceMapFilterSettingsSaveButton"
            >
              <FormattedMessage
                id="xpack.apm.serviceMapFilterSettings.saveButton"
                defaultMessage="Save"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
}
