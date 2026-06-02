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
  /** Current value of `apply_custom_filters` (default true). */
  initialApplyCustomFilters: boolean;
  onCancel: () => void;
  onSave: (applyCustomFilters: boolean) => void;
}

/**
 * Panel-level "filter settings" flyout for a service map dashboard panel. Holds the
 * "Apply custom panel filters" toggle. Time-range customization is handled separately by
 * Kibana's built-in "Customize time range" panel-menu action / panel Settings flyout.
 */
export function ServiceMapFilterSettingsFlyout({
  ariaLabelledBy,
  initialApplyCustomFilters,
  onCancel,
  onSave,
}: ServiceMapFilterSettingsFlyoutProps) {
  const [applyCustomFilters, setApplyCustomFilters] = useState<boolean>(initialApplyCustomFilters);

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
            helpText={i18n.translate(
              'xpack.apm.serviceMapFilterSettings.applyCustomFiltersHelpText',
              {
                defaultMessage:
                  "When on, the panel uses only its own filters and ignores the dashboard's KQL bar and Controls. When off, the panel also responds to the dashboard's global filters.",
              }
            )}
            fullWidth
          >
            <EuiSwitch
              label={i18n.translate('xpack.apm.serviceMapFilterSettings.applyCustomFiltersLabel', {
                defaultMessage: 'Apply custom panel filters',
              })}
              checked={applyCustomFilters}
              onChange={(e) => setApplyCustomFilters(e.target.checked)}
              data-test-subj="apmServiceMapFilterSettingsApplyCustomFiltersToggle"
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
              onClick={() => onSave(applyCustomFilters)}
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
