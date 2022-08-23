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
  EuiLoadingContent,
} from '@elastic/eui';
import { LazyField } from '@kbn/advanced-settings-plugin/public';
import { i18n } from '@kbn/i18n';
import {
  apmOperationsTab,
  apmServiceInventoryOptimizedSorting,
  apmTraceExplorerTab,
  enableServiceGroups,
} from '@kbn/observability-plugin/common';
import React, { useEffect, useState } from 'react';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useApmEditableSettings } from '../../../../hooks/use_apm_editable_settings';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { callApmApi } from '../../../../services/rest/create_call_apm_api';
import { Header } from './header';

const experimentalFeatureKeys = [
  apmTraceExplorerTab,
  enableServiceGroups,
  apmServiceInventoryOptimizedSorting,
  apmOperationsTab,
];

export function LabsSettingsFlyout() {
  const [isOpen, setIsOpen] = useState(false);
  const { docLinks, notifications } = useApmPluginContext().core;
  const [isLabsChecked, setIsLabsChecked] = useState(false);
  const {
    handleFieldChange,
    settingsEditableConfig,
    unsavedChanges,
    saveAll,
    isSaving,
    cleanUnsavedChanges,
  } = useApmEditableSettings(experimentalFeatureKeys);

  const { data = { experimentalFeatures: [] }, status } = useFetcher(() => {
    if (isOpen) {
      return callApmApi('GET /internal/apm/settings/experimental_feature', {
        signal: null,
      });
    }
  }, [isOpen]);

  // At this point only one saved object is going to be returned per space
  const [experimentalFeature] = data.experimentalFeatures;

  useEffect(() => {
    setIsLabsChecked(experimentalFeature?.enableExperimentalFeatures || false);
  }, [experimentalFeature]);

  function toggleFlyoutVisibility() {
    setIsOpen((state) => !state);
  }

  function handleExperimentalModeChange(checked: boolean) {
    setIsLabsChecked(checked);

    experimentalFeatureKeys.forEach((experimentalKey) => {
      handleFieldChange(experimentalKey, { value: checked });
    });
  }

  async function handleSave() {
    const reloadPage = Object.keys(unsavedChanges).some((key) => {
      return settingsEditableConfig[key].requiresPageReload;
    });

    await Promise.all([
      callApmApi('POST /internal/apm/settings/experimental_feature', {
        signal: null,
        params: {
          body: {
            savedObjectId: experimentalFeature?.savedObjectId,
            enableExperimentalFeatures: isLabsChecked,
            experimentalFeatures: JSON.stringify(
              Object.keys(settingsEditableConfig)
            ),
          },
        },
      }),
      saveAll(),
    ]);

    if (reloadPage) {
      window.location.reload();
    } else {
      setIsOpen(false);
    }
  }

  function handelCancel() {
    cleanUnsavedChanges();
    toggleFlyoutVisibility();
  }

  return (
    <>
      <EuiButtonEmpty color="text" onClick={toggleFlyoutVisibility}>
        {i18n.translate('xpack.apm.labs', { defaultMessage: 'Labs' })}
      </EuiButtonEmpty>
      {isOpen && (
        <EuiFlyout onClose={toggleFlyoutVisibility}>
          {status === FETCH_STATUS.LOADING ||
          status === FETCH_STATUS.NOT_INITIATED ? (
            <EuiLoadingContent lines={3} />
          ) : (
            <>
              <EuiFlyoutHeader hasBorder>
                <Header
                  isLabsChecked={isLabsChecked}
                  onChangeLabs={handleExperimentalModeChange}
                />
              </EuiFlyoutHeader>
              <EuiFlyoutBody>
                {experimentalFeatureKeys.map((settingKey, i) => {
                  const editableConfig = settingsEditableConfig[settingKey];
                  return (
                    <>
                      <LazyField
                        key={settingKey}
                        setting={editableConfig}
                        handleChange={handleFieldChange}
                        enableSaving
                        docLinks={docLinks.links}
                        toasts={notifications.toasts}
                        unsavedChanges={unsavedChanges[settingKey]}
                      />
                      <EuiHorizontalRule />
                    </>
                  );
                })}
              </EuiFlyoutBody>
              <EuiFlyoutFooter>
                <EuiFlexGroup justifyContent="spaceBetween">
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty onClick={handelCancel}>
                      {i18n.translate('xpack.apm.labs.cancel', {
                        defaultMessage: 'Cancel',
                      })}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton fill isLoading={isSaving} onClick={handleSave}>
                      {i18n.translate('xpack.apm.labs.reload', {
                        defaultMessage: 'Reload to apply changes',
                      })}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlyoutFooter>
            </>
          )}
        </EuiFlyout>
      )}
    </>
  );
}
