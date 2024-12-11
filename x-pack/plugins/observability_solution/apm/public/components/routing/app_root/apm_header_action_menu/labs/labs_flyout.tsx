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
  EuiIcon,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { withSuspense } from '@kbn/shared-ux-utility';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useEditableSettings, useUiTracker } from '@kbn/observability-shared-plugin/public';
import { FieldRowProvider } from '@kbn/management-settings-components-field-row';
import { ValueValidation } from '@kbn/core-ui-settings-browser/src/types';
import { useApmPluginContext } from '../../../../../context/apm_plugin/use_apm_plugin_context';
import { useFetcher, isPending } from '../../../../../hooks/use_fetcher';

const LazyFieldRow = React.lazy(async () => ({
  default: (await import('@kbn/management-settings-components-field-row')).FieldRow,
}));

const FieldRow = withSuspense(LazyFieldRow);

interface Props {
  onClose: () => void;
}

export function LabsFlyout({ onClose }: Props) {
  const trackApmEvent = useUiTracker({ app: 'apm' });
  const { docLinks, notifications, application } = useApmPluginContext().core;

  const canSave =
    application.capabilities.advancedSettings.save &&
    (application.capabilities.apm['settings:save'] as boolean);

  const { data, status } = useFetcher(
    (callApmApi) => callApmApi('GET /internal/apm/settings/labs'),
    []
  );
  const labsItems = data?.labsItems || [];

  const { fields, handleFieldChange, unsavedChanges, saveAll, isSaving, cleanUnsavedChanges } =
    useEditableSettings(labsItems);

  async function handleSave() {
    try {
      const reloadPage = Object.keys(unsavedChanges).some((key) => {
        return fields[key].requiresPageReload;
      });

      await saveAll();
      trackApmEvent({ metric: 'labs_save' });

      if (reloadPage) {
        window.location.reload();
      } else {
        onClose();
      }
    } catch (e) {
      const error = e as Error;
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.apm.apmSettings.save.error', {
          defaultMessage: 'An error occurred while saving the settings',
        }),
        text: error.message,
      });
    }
  }

  function handelCancel() {
    cleanUnsavedChanges();
    onClose();
  }

  const isLoading = isPending(status);

  // We don't validate the user input on these settings
  const settingsValidationResponse: ValueValidation = {
    successfulValidation: true,
    valid: true,
  };

  return (
    <EuiFlyout onClose={onClose}>
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type="beaker" size="l" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiTitle>
              <h2>
                {i18n.translate('xpack.apm.labs', {
                  defaultMessage: 'Labs',
                })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiText>
              {i18n.translate('xpack.apm.labs.description', {
                defaultMessage:
                  'Try out the APM features that are under technical preview and in progress.',
              })}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="labsFeedbackButton"
              href="https://ela.st/feedback-apm-labs"
              target="_blank"
              color="warning"
              iconType="editorComment"
            >
              {i18n.translate('xpack.apm.labs.feedbackButtonLabel', {
                defaultMessage: 'Tell us what you think!',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      {isLoading ? (
        <EuiSkeletonText lines={3} />
      ) : (
        <>
          <EuiFlyoutBody>
            {labsItems.map((settingKey) => {
              const field = fields[settingKey];
              return (
                <>
                  <FieldRowProvider
                    {...{
                      links: docLinks.links.management,
                      showDanger: (message: string) => notifications.toasts.addDanger(message),
                      validateChange: async () => settingsValidationResponse,
                    }}
                  >
                    <FieldRow
                      field={field}
                      isSavingEnabled={canSave}
                      onFieldChange={handleFieldChange}
                      unsavedChange={unsavedChanges[settingKey]}
                    />
                  </FieldRowProvider>
                  <EuiHorizontalRule />
                </>
              );
            })}
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty data-test-subj="apmLabsFlyoutCancelButton" onClick={handelCancel}>
                  {i18n.translate('xpack.apm.labs.cancel', {
                    defaultMessage: 'Cancel',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={
                    !canSave &&
                    i18n.translate('xpack.apm.labs.noPermissionTooltipLabel', {
                      defaultMessage:
                        "Your user role doesn't have permissions to modify these settings",
                    })
                  }
                >
                  <EuiButton
                    data-test-subj="apmLabsFlyoutReloadToApplyChangesButton"
                    fill
                    isLoading={isSaving}
                    onClick={handleSave}
                    isDisabled={!canSave}
                  >
                    {i18n.translate('xpack.apm.labs.reload', {
                      defaultMessage: 'Reload to apply changes',
                    })}
                  </EuiButton>
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </>
      )}
    </EuiFlyout>
  );
}
