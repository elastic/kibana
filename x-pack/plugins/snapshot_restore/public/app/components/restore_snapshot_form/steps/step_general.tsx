/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiDescribedFormGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldText,
  EuiFormRow,
  EuiSelectable,
  EuiSpacer,
  EuiSwitch,
  EuiTitle,
} from '@elastic/eui';
import { Option } from '@elastic/eui/src/components/selectable/types';
import { RestoreSettings } from '../../../../../common/types';
import { StepProps } from './';

export const RestoreSnapshotStepGeneral: React.FunctionComponent<StepProps> = ({
  snapshotDetails,
  restoreSettings,
  updateRestoreSettings,
}) => {
  const { indices: snapshotIndices } = snapshotDetails;
  const {
    indices: restoreIndices,
    renamePattern,
    renameReplacement,
    partial,
    includeGlobalState,
  } = restoreSettings;

  // States for choosing all indices, or a subset, including caching previously chosen subset list
  const [isAllIndices, setIsAllIndices] = useState<boolean>(!Boolean(restoreIndices));
  const [indicesOptions, setIndicesOptions] = useState<Option[]>(
    snapshotIndices.map(index => ({
      label: index,
      checked: 'on',
    }))
  );

  // State for setting renaming indices patterns
  const [isRenamingIndices, setIsRenamingIndices] = useState<boolean>(
    Boolean(renamePattern || renameReplacement)
  );

  // Caching state for togglable settings
  const [cachedRestoreSettings, setCachedRestoreSettings] = useState<RestoreSettings>({
    indices: [...snapshotIndices],
    renamePattern: '',
    renameReplacement: '',
  });

  return (
    <div className="snapshotRestore__restoreForm__stepGeneral">
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.restoreForm.stepGeneral.indicesTitle"
                defaultMessage="Indices"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.restoreForm.stepGeneral.indicesDescription"
            defaultMessage="The restore operation creates new indices if they do not exist.
              Existing indices can only be restored if it's closed and has the same number of shards as
              the index in the snapshot."
          />
        }
        idAria="stepGeneralIndicesDescription"
        fullWidth
      >
        <EuiFormRow hasEmptyLabelSpace fullWidth describedByIds={['stepGeneralIndicesDescription']}>
          {/* Fragment needed because EuiFormRow can only have one child: https://github.com/elastic/eui/issues/1931 */}
          <Fragment>
            <EuiSwitch
              label={
                <FormattedMessage
                  id="xpack.snapshotRestore.restoreForm.stepGeneral.allIndicesLabel"
                  defaultMessage="All indices"
                />
              }
              checked={isAllIndices}
              onChange={e => {
                const isChecked = e.target.checked;
                setIsAllIndices(isChecked);
                if (isChecked) {
                  updateRestoreSettings({ indices: undefined });
                } else {
                  updateRestoreSettings({
                    indices: [...(cachedRestoreSettings.indices || [])],
                  });
                }
              }}
            />
            {isAllIndices ? null : (
              <Fragment>
                <EuiSpacer size="m" />
                <EuiFormRow
                  label={
                    <FormattedMessage
                      id="xpack.snapshotRestore.restoreForm.stepGeneral.selectIndicesLabel"
                      defaultMessage="Select indices"
                    />
                  }
                  helpText={
                    <FormattedMessage
                      id="xpack.snapshotRestore.restoreForm.stepGeneral.selectIndicesHelpText"
                      defaultMessage="Only the selected indices will be restored"
                    />
                  }
                >
                  <EuiSelectable
                    allowExclusions={false}
                    options={indicesOptions}
                    onChange={options => {
                      const newSelectedIndices: string[] = [];
                      options.forEach(({ label, checked }) => {
                        if (checked === 'on') {
                          newSelectedIndices.push(label);
                        }
                      });
                      updateRestoreSettings({ indices: [...newSelectedIndices] });
                      setIndicesOptions(options);
                      setCachedRestoreSettings({
                        ...cachedRestoreSettings,
                        indices: [...newSelectedIndices],
                      });
                    }}
                    listProps={{ bordered: true }}
                  >
                    {list => list}
                  </EuiSelectable>
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
                id="xpack.snapshotRestore.restoreForm.stepGeneral.renameIndicesTitle"
                defaultMessage="Rename indices"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.restoreForm.stepGeneral.renameIndicesDescription"
            defaultMessage="Rename indices when they are restored."
          />
        }
        idAria="stepGeneralRenameIndicesDescription"
        fullWidth
      >
        <EuiFormRow
          hasEmptyLabelSpace
          fullWidth
          describedByIds={['stepGeneralRenameIndicesDescription']}
        >
          {/* Fragment needed because EuiFormRow can only have one child: https://github.com/elastic/eui/issues/1931 */}
          <Fragment>
            <EuiSwitch
              label={
                <FormattedMessage
                  id="xpack.snapshotRestore.restoreForm.stepGeneral.renameIndicesLabel"
                  defaultMessage="Rename indices"
                />
              }
              checked={isRenamingIndices}
              onChange={e => {
                const isChecked = e.target.checked;
                setIsRenamingIndices(isChecked);
                if (isChecked) {
                  updateRestoreSettings({
                    renamePattern: cachedRestoreSettings.renamePattern,
                    renameReplacement: cachedRestoreSettings.renameReplacement,
                  });
                } else {
                  updateRestoreSettings({
                    renamePattern: undefined,
                    renameReplacement: undefined,
                  });
                }
              }}
            />
            {!isRenamingIndices ? null : (
              <Fragment>
                <EuiSpacer size="m" />
                <EuiFlexGroup>
                  <EuiFlexItem>
                    <EuiFormRow
                      label={
                        <FormattedMessage
                          id="xpack.snapshotRestore.restoreForm.stepGeneral.renamePatternLabel"
                          defaultMessage="Capture pattern"
                        />
                      }
                      helpText={
                        <FormattedMessage
                          id="xpack.snapshotRestore.restoreForm.stepGeneral.renamePatternHelpText"
                          defaultMessage="Use regular expressions"
                        />
                      }
                    >
                      <EuiFieldText
                        value={renamePattern}
                        placeholder="index_(.+)"
                        onChange={e => {
                          setCachedRestoreSettings({
                            ...cachedRestoreSettings,
                            renamePattern: e.target.value,
                          });
                          updateRestoreSettings({
                            renamePattern: e.target.value,
                          });
                        }}
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiFormRow
                      label={
                        <FormattedMessage
                          id="xpack.snapshotRestore.restoreForm.stepGeneral.renameReplacementLabel"
                          defaultMessage="Replacement pattern"
                        />
                      }
                    >
                      <EuiFieldText
                        value={renameReplacement}
                        placeholder="restored_index_$1"
                        onChange={e => {
                          setCachedRestoreSettings({
                            ...cachedRestoreSettings,
                            renameReplacement: e.target.value,
                          });
                          updateRestoreSettings({
                            renameReplacement: e.target.value,
                          });
                        }}
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                </EuiFlexGroup>
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
                id="xpack.snapshotRestore.restoreForm.stepGeneral.partialTitle"
                defaultMessage="Partial restore"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.restoreForm.stepGeneral.partialDescription"
            defaultMessage="Allow restore of indices that don't have snapshots of all shards."
          />
        }
        idAria="stepGeneralPartialDescription"
        fullWidth
      >
        <EuiFormRow
          hasEmptyLabelSpace={true}
          fullWidth
          describedByIds={['stepGeneralPartialDescription']}
        >
          <EuiSwitch
            label={
              <FormattedMessage
                id="xpack.snapshotRestore.restoreForm.stepGeneral.partialLabel"
                defaultMessage="Ignore unavailable indices"
              />
            }
            checked={partial === undefined ? false : partial}
            onChange={e => updateRestoreSettings({ partial: e.target.checked })}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>

      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.restoreForm.stepGeneral.includeGlobalStateTitle"
                defaultMessage="Include global state"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.restoreForm.stepGeneral.includeGlobalStateDescription"
            defaultMessage="Restored templates that don't currently exist in the cluster are added
              and existing templates with the same name are overriden by the restored templates.
              Restored persistent settings are added to the existing persistent settings."
          />
        }
        idAria="stepGeneralIncludeGlobalStateDescription"
        fullWidth
      >
        <EuiFormRow
          hasEmptyLabelSpace={true}
          fullWidth
          describedByIds={['stepGeneralIncludeGlobalStateDescription']}
        >
          <EuiSwitch
            label={
              <FormattedMessage
                id="xpack.snapshotRestore.restoreForm.stepGeneral.includeGlobalStateLabel"
                defaultMessage="Include global state"
              />
            }
            checked={includeGlobalState === undefined ? false : includeGlobalState}
            onChange={e => updateRestoreSettings({ includeGlobalState: e.target.checked })}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    </div>
  );
};
