/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiComboBox,
  EuiDescribedFormGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldText,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
  EuiTitle,
} from '@elastic/eui';
import { RestoreSettings } from '../../../../../common/types';
import { ALLOWED_INDEX_SETTINGS } from '../../../constants';
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

  // Settings for ignore settings combobox suggestions, using a state because users can add custom settings
  const [ignoreIndexSettingsOptions, setIgnoreIndexSettingsOptions] = useState<
    Array<{ label: string }>
  >(
    [...new Set((ignoreIndexSettings || []).concat([...ALLOWED_INDEX_SETTINGS].sort()))].map(
      setting => ({
        label: setting,
      })
    )
  );

  return (
    <div className="snapshotRestore__restoreForm__stepSettings">
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.restoreForm.stepSettings.indexSettingsTitle"
                defaultMessage="Index settings"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.restoreForm.stepSettings.indexSettingsDescription"
            defaultMessage="Override some index settings during the restore process."
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
                  defaultMessage="Override index settings"
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
            {!isUsingIndexSettings ? null : <Fragment>settings thing here</Fragment>}
          </Fragment>
        </EuiFormRow>
      </EuiDescribedFormGroup>

      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.restoreForm.stepSettings.ignoreIndexSettingsTitle"
                defaultMessage="Ignore index settings"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.restoreForm.stepSettings.ignoreIndexSettingsDescription"
            defaultMessage="Set some index settings back to default during the restore process."
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
                  defaultMessage="Ignore index settings"
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
                      setCachedRestoreSettings({ ignoreIndexSettings: newIgnoreIndexSettings });
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
