/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiButtonEmpty,
  EuiCode,
  EuiCodeEditor,
  EuiComboBox,
  EuiDescribedFormGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { RestoreSettings } from '../../../../../common/types';
import { REMOVE_INDEX_SETTINGS_SUGGESTIONS } from '../../../constants';
import { documentationLinksService } from '../../../services/documentation';
import { StepProps } from './';

export const RestoreSnapshotStepSettings: React.FunctionComponent<StepProps> = ({
  restoreSettings,
  updateRestoreSettings,
}) => {
  const { indexSettings, ignoreIndexSettings } = restoreSettings;

  // State for index setting toggles
  const [isUsingIndexSettings, setIsUsingIndexSettings] = useState<boolean>(Boolean(indexSettings));
  const [isUsingIgnoreIndexSettings, setIsUsingIgnoreIndexSettings] = useState<boolean>(
    Boolean(ignoreIndexSettings)
  );

  // Caching state for togglable settings
  const [cachedRestoreSettings, setCachedRestoreSettings] = useState<RestoreSettings>({
    indexSettings: indexSettings ? { ...indexSettings } : {},
    ignoreIndexSettings: ignoreIndexSettings ? [...ignoreIndexSettings] : [],
  });

  // State for raw (string) input for modify index settings
  const [rawIndexSettings, setRawIndexSettings] = useState<string>(
    JSON.stringify(cachedRestoreSettings.indexSettings, null, 2)
  );
  const [isRawIndexSettingsValid, setIsRawIndexSettingsValid] = useState<boolean>(true);

  // List of settings for ignore settings combobox suggestions, using a state because users can add custom settings
  const [ignoreIndexSettingsOptions, setIgnoreIndexSettingsOptions] = useState<
    Array<{ label: string }>
  >(
    [
      ...new Set((ignoreIndexSettings || []).concat([...REMOVE_INDEX_SETTINGS_SUGGESTIONS].sort())),
    ].map(setting => ({
      label: setting,
    }))
  );

  return (
    <div className="snapshotRestore__restoreForm__stepSettings">
      {/* Step title and doc link */}
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle>
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.restoreForm.stepSettingsTitle"
                defaultMessage="Index settings (optional)"
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.snapshotRestore.restoreForm.stepSettingsDescription"
                defaultMessage="Change index settings during the restore process."
              />
            </p>
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            flush="right"
            href={documentationLinksService.getRestoreIndexSettingsUrl()}
            target="_blank"
            iconType="help"
          >
            <FormattedMessage
              id="xpack.rollupJobs.create.stepSettings.docsButtonLabel"
              defaultMessage="Index settings docs"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />

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
            defaultMessage="Modify some index settings during the restore process."
          />
        }
        idAria="stepSettingsIndexSettingsDescription"
        fullWidth
      >
        <EuiFormRow
          hasEmptyLabelSpace
          fullWidth
          describedByIds={['stepSettingsIndexSettingsDescription']}
        >
          {/* Fragment needed because EuiFormRow can only have one child: https://github.com/elastic/eui/issues/1931 */}
          <Fragment>
            <EuiSwitch
              label={
                <FormattedMessage
                  id="xpack.snapshotRestore.restoreForm.stepSettings.indexSettingsLabel"
                  defaultMessage="Modify index settings"
                />
              }
              checked={isUsingIndexSettings}
              onChange={e => {
                const isChecked = e.target.checked;
                if (isChecked) {
                  setIsUsingIndexSettings(true);
                  updateRestoreSettings({
                    indexSettings: { ...cachedRestoreSettings.indexSettings },
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
                  describedByIds={['stepSettingsIndexSettingsDescription']}
                  isInvalid={!isRawIndexSettingsValid}
                  error={
                    <FormattedMessage
                      id="xpack.snapshotRestore.restoreForm.stepSettings.indexSettingsEditorFormatError"
                      defaultMessage="Invalid JSON format"
                    />
                  }
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
                    value={rawIndexSettings}
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
                    aria-label={
                      <FormattedMessage
                        id="xpack.snapshotRestore.restoreForm.stepSettings.indexSettingsAriaLabel"
                        defaultMessage="Index settings to modify"
                      />
                    }
                    onChange={(value: string) => {
                      setRawIndexSettings(value);
                      try {
                        const parsedSettings = JSON.parse(value);
                        setIsRawIndexSettingsValid(true);
                        updateRestoreSettings({
                          indexSettings: parsedSettings,
                        });
                        setCachedRestoreSettings({
                          ...cachedRestoreSettings,
                          indexSettings: parsedSettings,
                        });
                      } catch (e) {
                        setIsRawIndexSettingsValid(false);
                      }
                    }}
                  />
                </EuiFormRow>
              </Fragment>
            )}
          </Fragment>
        </EuiFormRow>
      </EuiDescribedFormGroup>

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
            defaultMessage="Reset some index settings back to default during the restore process."
          />
        }
        idAria="stepSettingsIgnoreIndexSettingsDescription"
        fullWidth
      >
        <EuiFormRow
          hasEmptyLabelSpace
          fullWidth
          describedByIds={['stepSettingsIgnoreIndexSettingsDescription']}
        >
          {/* Fragment needed because EuiFormRow can only have one child: https://github.com/elastic/eui/issues/1931 */}
          <Fragment>
            <EuiSwitch
              label={
                <FormattedMessage
                  id="xpack.snapshotRestore.restoreForm.stepSettings.ignoreIndexSettingsLabel"
                  defaultMessage="Reset index settings"
                />
              }
              checked={isUsingIgnoreIndexSettings}
              onChange={e => {
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
                    onChange={selectedOptions => {
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
                      if (
                        !Boolean(
                          flattenedOptions.find(({ label }) => label === normalizedSettingName)
                        )
                      ) {
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
