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
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHorizontalRule,
} from '@elastic/eui';
import { LazyField } from '@kbn/advanced-settings-plugin/public';
import { IToasts } from '@kbn/core-notifications-browser';
import { DocLinks } from '@kbn/doc-links';
import { i18n } from '@kbn/i18n';
import {
  apmOperationsTab,
  apmServiceInventoryOptimizedSorting,
  apmTraceExplorerTab,
  enableServiceGroups,
} from '@kbn/observability-plugin/common';
import { isEmpty } from 'lodash';
import React, { useState } from 'react';
import { useApmEditableSettings } from '../../../../hooks/use_apm_editable_settings';
import { Header } from './header';

const experimentalFeatureKeys = [
  apmTraceExplorerTab,
  enableServiceGroups,
  apmServiceInventoryOptimizedSorting,
  apmOperationsTab,
];

export function LabsSettingsFlyout() {
  const [isOpen, setIsOpen] = useState(true);
  const [isLabsChecked, setIsLabsChecked] = useState(false);
  const { handleFieldChange, settingsEditableConfig, unsavedChanges } =
    useApmEditableSettings(experimentalFeatureKeys);

  function toggleFlyoutVisibility() {
    setIsOpen((state) => !state);
  }

  function handleExperimentalModeChange(checked: boolean) {
    setIsLabsChecked(checked);

    experimentalFeatureKeys.forEach((experimentalKey) => {
      handleFieldChange(experimentalKey, { value: checked });
    });
  }

  return (
    <>
      <EuiButtonEmpty color="text" onClick={toggleFlyoutVisibility}>
        {i18n.translate('xpack.apm.labs', { defaultMessage: 'Labs' })}
      </EuiButtonEmpty>
      {isOpen && (
        <EuiFlyout onClose={toggleFlyoutVisibility}>
          <EuiFlyoutHeader hasBorder>
            <Header
              isLabsChecked={isLabsChecked}
              onChangeLabs={handleExperimentalModeChange}
            />
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <>
              {experimentalFeatureKeys.map((settingKey, i) => {
                const editableConfig = settingsEditableConfig[settingKey];
                return (
                  <>
                    <LazyField
                      key={settingKey}
                      setting={editableConfig}
                      handleChange={handleFieldChange}
                      enableSaving
                      docLinks={{} as DocLinks}
                      toasts={{} as IToasts}
                      unsavedChanges={unsavedChanges[settingKey]}
                    />
                    <EuiHorizontalRule />
                  </>
                );
              })}
            </>
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty>
                  {i18n.translate('xpack.apm.labs.cancel', {
                    defaultMessage: 'Cancel',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  disabled={!isLabsChecked && isEmpty(unsavedChanges)}
                >
                  {i18n.translate('xpack.apm.labs.reload', {
                    defaultMessage: 'Reload to apply changes',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      )}
    </>
  );
}
