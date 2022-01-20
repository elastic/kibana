/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButtonEmpty,
  EuiCode,
  EuiComboBox,
  EuiDescribedFormGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
  EuiTitle,
  EuiLink,
  EuiCallOut,
} from '@elastic/eui';
import { RestoreSettings } from '../../../../../common/types';
import { EuiCodeEditor } from '../../../../shared_imports';
import { REMOVE_INDEX_SETTINGS_SUGGESTIONS } from '../../../constants';
import { useCore, useServices } from '../../../app_context';
import { StepProps } from './';

export const RestoreSnapshotStepSettings: React.FunctionComponent<StepProps> = ({
  restoreSettings,
  updateRestoreSettings,
  snapshotDetails,
  errors,
}) => {
  const { i18n } = useServices();
  const { docLinks } = useCore();
  const { indexSettings, ignoreIndexSettings } = restoreSettings;
  const { dataStreams } = snapshotDetails;

  // State for index setting toggles
  const [isUsingIndexSettings, setIsUsingIndexSettings] = useState<boolean>(Boolean(indexSettings));
  const [isUsingIgnoreIndexSettings, setIsUsingIgnoreIndexSettings] = useState<boolean>(
    Boolean(ignoreIndexSettings)
  );

  // Caching state for togglable settings
  const [cachedRestoreSettings, setCachedRestoreSettings] = useState<RestoreSettings>({
    indexSettings: indexSettings || '{}',
    ignoreIndexSettings: ignoreIndexSettings ? [...ignoreIndexSettings] : [],
  });

  // List of settings for ignore settings combobox suggestions, using a state because users can add custom settings
  const [ignoreIndexSettingsOptions, setIgnoreIndexSettingsOptions] = useState<
    Array<{ label: string }>
  >(
    [
      ...new Set((ignoreIndexSettings || []).concat([...REMOVE_INDEX_SETTINGS_SUGGESTIONS].sort())),
    ].map((setting) => ({
      label: setting,
    }))
  );

  // Index settings doc link
  const indexSettingsDocLink = (
    <EuiLink href={docLinks.links.elasticsearch.indexModules} target="_blank">
      <FormattedMessage
        id="xpack.snapshotRestore.restoreForm.stepSettings.indexSettingsDocLinkText"
        defaultMessage="Learn more."
      />
    </EuiLink>
  );

  return (
    <div className="snapshotRestore__restoreForm__stepSettings">
      {/* Step title and doc link */}
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle>
            <h2>
              <FormattedMessage
                id="xpack.snapshotRestore.restoreForm.stepSettingsTitle"
                defaultMessage="Index settings"
              />
            </h2>
          </EuiTitle>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            flush="right"
            href={docLinks.links.snapshotRestore.changeIndexSettings}
            target="_blank"
            iconType="help"
          >
            <FormattedMessage
              id="xpack.snapshotRestore.restoreForm.stepSettings.docsButtonLabel"
              defaultMessage="Index settings docs"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      {dataStreams?.length ? (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut
            iconType="help"
            title={i18n.translate(
              'xpack.snapshotRestore.restoreForm.stepSettings.dataStreamsCallout.title',
              { defaultMessage: 'Backing indices' }
            )}
          >
            <FormattedMessage
              id="xpack.snapshotRestore.restoreForm.stepSettings.dataStreamsCallout.description"
              defaultMessage="These settings also apply to the backing indices of data streams."
            />
          </EuiCallOut>
        </>
      ) : undefined}
      <EuiSpacer size="l" />

      {/* Modify index settings */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.restoreForm.stepSettings.indexSettingsTitle"
                defaultMessage="Modify index settings"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.restoreForm.stepSettings.indexSettingsDescription"
            defaultMessage="Overrides index settings during restore. {docLink}"
            values={{
              docLink: indexSettingsDocLink,
            }}
          />
        }
        fullWidth
      >
        <EuiFormRow hasEmptyLabelSpace fullWidth>
          <Fragment>
            <EuiSwitch
              data-test-subj="modifyIndexSettingsSwitch"
              label={
                <FormattedMessage
                  id="xpack.snapshotRestore.restoreForm.stepSettings.indexSettingsLabel"
                  defaultMessage="Modify index settings"
                />
              }
              checked={isUsingIndexSettings}
              onChange={(e) => {
                const isChecked = e.target.checked;
                if (isChecked) {
                  setIsUsingIndexSettings(true);
                  updateRestoreSettings({
                    indexSettings: cachedRestoreSettings.indexSettings,
                  });
                } else {
                  setIsUsingIndexSettings(false);
                  updateRestoreSettings({ indexSettings: undefined });
                }
              }}
            />
            {!isUsingIndexSettings ? null : (
              <Fragment>
                <EuiSpacer size="m" />
                <EuiFormRow
                  label={
                    <FormattedMessage
                      id="xpack.snapshotRestore.restoreForm.stepSettings.indexSettingsEditorLabel"
                      defaultMessage="Index settings"
                    />
                  }
                  fullWidth
                  isInvalid={Boolean(errors.indexSettings)}
                  error={errors.indexSettings}
                  helpText={
                    <FormattedMessage
                      id="xpack.snapshotRestore.restoreForm.stepSettings.indexSettingsEditorDescription"
                      defaultMessage="Use JSON format: {format}"
                      values={{
                        format: <EuiCode>{'{ "index.number_of_replicas": 0 }'}</EuiCode>,
                      }}
                    />
                  }
                >
                  <EuiCodeEditor
                    mode="json"
                    theme="textmate"
                    width="100%"
                    value={indexSettings}
                    setOptions={{
                      showLineNumbers: false,
                      tabSize: 2,
                      maxLines: Infinity,
                    }}
                    editorProps={{
                      $blockScrolling: Infinity,
                    }}
                    showGutter={false}
                    minLines={6}
                    maxLines={15}
                    aria-label={i18n.translate(
                      'xpack.snapshotRestore.restoreForm.stepSettings.indexSettingsAriaLabel',
                      { defaultMessage: 'Index settings to modify' }
                    )}
                    onChange={(value: string) => {
                      updateRestoreSettings({
                        indexSettings: value,
                      });
                      setCachedRestoreSettings({
                        ...cachedRestoreSettings,
                        indexSettings: value,
                      });
                    }}
                  />
                </EuiFormRow>
              </Fragment>
            )}
          </Fragment>
        </EuiFormRow>
      </EuiDescribedFormGroup>

      {/* Ignore index settings */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.restoreForm.stepSettings.ignoreIndexSettingsTitle"
                defaultMessage="Reset index settings"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.restoreForm.stepSettings.ignoreIndexSettingsDescription"
            defaultMessage="Resets selected settings to default during restore. {docLink}"
            values={{
              docLink: indexSettingsDocLink,
            }}
          />
        }
        fullWidth
      >
        <EuiFormRow hasEmptyLabelSpace fullWidth>
          <Fragment>
            <EuiSwitch
              label={
                <FormattedMessage
                  id="xpack.snapshotRestore.restoreForm.stepSettings.ignoreIndexSettingsLabel"
                  defaultMessage="Reset index settings"
                />
              }
              checked={isUsingIgnoreIndexSettings}
              onChange={(e) => {
                const isChecked = e.target.checked;
                if (isChecked) {
                  setIsUsingIgnoreIndexSettings(true);
                  updateRestoreSettings({
                    ignoreIndexSettings: [...(cachedRestoreSettings.ignoreIndexSettings || [])],
                  });
                } else {
                  setIsUsingIgnoreIndexSettings(false);
                  updateRestoreSettings({ ignoreIndexSettings: undefined });
                }
              }}
            />
            {!isUsingIgnoreIndexSettings ? null : (
              <Fragment>
                <EuiSpacer size="m" />
                <EuiFormRow
                  label={
                    <FormattedMessage
                      id="xpack.snapshotRestore.restoreForm.stepSettings.selectIgnoreIndexSettingsLabel"
                      defaultMessage="Select settings"
                    />
                  }
                  isInvalid={Boolean(errors.ignoreIndexSettings)}
                  error={errors.ignoreIndexSettings}
                >
                  <EuiComboBox
                    placeholder={i18n.translate(
                      'xpack.snapshotRestore.restoreForm.stepSettings.ignoreIndexSettingsPlaceholder',
                      {
                        defaultMessage: 'Select or type index settings',
                      }
                    )}
                    options={ignoreIndexSettingsOptions}
                    selectedOptions={
                      ignoreIndexSettings
                        ? ignoreIndexSettingsOptions.filter(({ label }) =>
                            ignoreIndexSettings.includes(label)
                          )
                        : []
                    }
                    onChange={(selectedOptions) => {
                      const newIgnoreIndexSettings = selectedOptions.map(({ label }) => label);
                      updateRestoreSettings({ ignoreIndexSettings: newIgnoreIndexSettings });
                      setCachedRestoreSettings({
                        ...cachedRestoreSettings,
                        ignoreIndexSettings: newIgnoreIndexSettings,
                      });
                    }}
                    onCreateOption={(
                      newIndexSetting: string,
                      flattenedOptions: Array<{ label: string }>
                    ) => {
                      const normalizedSettingName = newIndexSetting.trim().toLowerCase();
                      if (!normalizedSettingName) {
                        return;
                      }
                      const isCustomSetting = !Boolean(
                        flattenedOptions.find(({ label }) => label === normalizedSettingName)
                      );
                      if (isCustomSetting) {
                        setIgnoreIndexSettingsOptions([
                          { label: normalizedSettingName },
                          ...ignoreIndexSettingsOptions,
                        ]);
                      }
                      updateRestoreSettings({
                        ignoreIndexSettings: [
                          ...(ignoreIndexSettings || []),
                          normalizedSettingName,
                        ],
                      });
                      setCachedRestoreSettings({
                        ...cachedRestoreSettings,
                        ignoreIndexSettings: [
                          ...(ignoreIndexSettings || []),
                          normalizedSettingName,
                        ],
                      });
                    }}
                    isClearable={true}
                  />
                </EuiFormRow>
              </Fragment>
            )}
          </Fragment>
        </EuiFormRow>
      </EuiDescribedFormGroup>
    </div>
  );
};
