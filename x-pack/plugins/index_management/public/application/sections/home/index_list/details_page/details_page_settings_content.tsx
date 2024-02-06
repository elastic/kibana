/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, FunctionComponent, useCallback } from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiSwitchEvent,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import _ from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { CodeEditor } from '@kbn/code-editor';
import { monaco as monacoEditor } from '@kbn/monaco';
import { IndexSettingsResponse } from '../../../../../../common';
import { Error } from '../../../../../shared_imports';
import { documentationService, updateIndexSettings } from '../../../../services';
import { notificationService } from '../../../../services/notification';
import { flattenObject } from '../../../../lib/flatten_object';
import {
  readOnlySettings,
  defaultsToDisplay,
  limitedEditableSettings,
} from '../../../../lib/edit_settings';
import { AppDependencies, useAppContext } from '../../../../app_context';

const getEditableSettings = ({
  data,
  editableIndexSettings,
}: {
  data: Props['data'];
  editableIndexSettings: AppDependencies['config']['editableIndexSettings'];
}): { originalSettings: Record<string, any>; settingsString: string } => {
  const { defaults, settings } = data;
  // settings user has actually set
  const flattenedSettings = flattenObject(settings);
  // settings with their defaults
  const flattenedDefaults = flattenObject(defaults);
  const filteredDefaults = _.pick(flattenedDefaults, defaultsToDisplay);

  let newSettings = { ...filteredDefaults, ...flattenedSettings };
  if (editableIndexSettings === 'limited') {
    // only pick limited settings
    newSettings = _.pick(newSettings, limitedEditableSettings);
  } else {
    // remove read only settings
    readOnlySettings.forEach((e) => delete newSettings[e]);
  }

  const settingsString = JSON.stringify(newSettings, null, 2);
  return { originalSettings: newSettings, settingsString };
};

interface Props {
  data: IndexSettingsResponse;
  indexName: string;
  reloadIndexSettings: () => void;
}

export const DetailsPageSettingsContent: FunctionComponent<Props> = ({
  data,
  indexName,
  reloadIndexSettings,
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const {
    config: { editableIndexSettings },
  } = useAppContext();
  const onEditModeChange = (event: EuiSwitchEvent) => {
    setUpdateError(null);
    setIsEditMode(event.target.checked);
  };

  const { originalSettings, settingsString } = getEditableSettings({
    data,
    editableIndexSettings,
  });
  const [editableSettings, setEditableSettings] = useState(settingsString);
  const [isLoading, setIsLoading] = useState(false);
  const [updateError, setUpdateError] = useState<Error | null>(null);

  const resetChanges = useCallback(() => {
    setUpdateError(null);
    setEditableSettings(settingsString);
  }, [settingsString]);

  const updateSettings = useCallback(async () => {
    setUpdateError(null);
    setIsLoading(true);
    try {
      const editedSettings = JSON.parse(editableSettings);
      // don't set if the values have not changed
      Object.keys(originalSettings).forEach((key) => {
        if (_.isEqual(originalSettings[key], editedSettings[key])) {
          delete editedSettings[key];
        }
      });

      if (Object.keys(editedSettings).length !== 0) {
        const { error } = await updateIndexSettings(indexName, editedSettings);
        if (error) {
          setIsLoading(false);
          setUpdateError(error);
        } else {
          setIsLoading(false);
          setIsEditMode(false);
          notificationService.showSuccessToast(
            i18n.translate('xpack.idxMgmt.indexDetails.settings.updateSuccessMessage', {
              defaultMessage: 'Successfully updated settings for index {indexName}',
              values: { indexName },
            })
          );
          reloadIndexSettings();
        }
      } else {
        setIsLoading(false);
        setIsEditMode(false);
        notificationService.showWarningToast(
          i18n.translate('xpack.idxMgmt.indexDetails.settings.noChangeWarning', {
            defaultMessage: 'No settings changed',
          })
        );
      }
    } catch (e) {
      setIsLoading(false);
      setUpdateError({
        error: i18n.translate('xpack.idxMgmt.indexDetails.settings.updateError', {
          defaultMessage: 'Unable to update settings',
        }),
      });
    }
  }, [originalSettings, editableSettings, indexName, reloadIndexSettings]);
  const settingsSchemaProperties = {} as Record<string, unknown>;
  Object.keys(originalSettings).forEach(
    // allow any type of value
    (setting) =>
      (settingsSchemaProperties[setting] = {
        type: ['null', 'boolean', 'object', 'array', 'number', 'string'],
      })
  );
  return (
    // using "rowReverse" to keep the card on the left side to be on top of the code block on smaller screens
    <EuiFlexGroup
      wrap
      direction="rowReverse"
      css={css`
        height: 100%;
      `}
    >
      <EuiFlexItem
        grow={1}
        css={css`
          min-width: 400px;
        `}
      >
        <EuiPanel grow={false} paddingSize="l">
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiIcon type="pencil" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText>
                <b>
                  <FormattedMessage
                    id="xpack.idxMgmt.indexDetails.settings.docsCardTitle"
                    defaultMessage="Edit index settings"
                  />
                </b>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <EuiSwitch
            data-test-subj="indexDetailsSettingsEditModeSwitch"
            label={
              <FormattedMessage
                id="xpack.idxMgmt.indexDetails.settings.editModeSwitchLabel"
                defaultMessage="Edit mode"
              />
            }
            checked={isEditMode}
            onChange={onEditModeChange}
          />
          <EuiSpacer size="m" />
          <EuiFlexGroup>
            <EuiFlexItem grow={1}>
              <EuiButton
                data-test-subj="indexDetailsSettingsSave"
                fill
                isDisabled={!isEditMode || !editableSettings || settingsString === editableSettings}
                isLoading={isLoading}
                onClick={updateSettings}
              >
                <FormattedMessage
                  id="xpack.idxMgmt.indexDetails.settings.saveButtonLabel"
                  defaultMessage="Save changes"
                />
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={1}>
              <EuiButton
                data-test-subj="indexDetailsSettingsResetChanges"
                isDisabled={!isEditMode || isLoading || settingsString === editableSettings}
                onClick={resetChanges}
              >
                <FormattedMessage
                  id="xpack.idxMgmt.indexDetails.settings.resetChangesButtonLabel"
                  defaultMessage="Reset changes"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>

          {updateError && (
            <>
              <EuiSpacer size="m" />
              <EuiCallOut
                title={i18n.translate(
                  'xpack.idxMgmt.indexDetails.settings.saveSettingsErrorMessage',
                  {
                    defaultMessage: 'Unable to save settings',
                  }
                )}
                color="danger"
                iconType="error"
              >
                {updateError.message && <p>{updateError.message}</p>}
              </EuiCallOut>
            </>
          )}
          <EuiSpacer size="m" />
          <EuiLink
            data-test-subj="indexDetailsSettingsDocsLink"
            href={documentationService.getSettingsDocumentationLink()}
            target="_blank"
            external
          >
            <FormattedMessage
              id="xpack.idxMgmt.indexDetails.settings.docsCardLink"
              defaultMessage="Learn more about settings"
            />
          </EuiLink>
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem
        grow={3}
        css={css`
          min-width: 600px;
        `}
      >
        <EuiPanel>
          {isEditMode ? (
            <CodeEditor
              languageId="json"
              editorDidMount={(editor) => {
                monacoEditor.languages.json.jsonDefaults.setDiagnosticsOptions({
                  validate: true,
                  schemas: [
                    {
                      uri: editor.getModel()?.uri.toString() ?? '',
                      fileMatch: ['*'],
                      schema: {
                        type: 'object',
                        properties: settingsSchemaProperties,
                      },
                    },
                  ],
                });
              }}
              value={editableSettings}
              data-test-subj="indexDetailsSettingsEditor"
              options={{
                lineNumbers: 'off',
                tabSize: 2,
                automaticLayout: true,
              }}
              aria-label={i18n.translate(
                'xpack.idxMgmt.formWizard.stepSettings.fieldIndexSettingsAriaLabel',
                {
                  defaultMessage: 'Index settings editor',
                }
              )}
              onChange={setEditableSettings}
            />
          ) : (
            <EuiCodeBlock
              language="json"
              isCopyable
              data-test-subj="indexDetailsSettingsCodeBlock"
              css={css`
                height: 100%;
              `}
            >
              {JSON.stringify(data, null, 2)}
            </EuiCodeBlock>
          )}
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
