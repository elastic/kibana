/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiButtonEmpty,
  EuiDescribedFormGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldText,
  EuiFormRow,
  EuiSelectable,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { Option } from '@elastic/eui/src/components/selectable/types';
import { RestoreSettings } from '../../../../../common/types';
import { documentationLinksService } from '../../../services/documentation';
import { StepProps } from './';

export const RestoreSnapshotStepLogistics: React.FunctionComponent<StepProps> = ({
  snapshotDetails,
  restoreSettings,
  updateRestoreSettings,
}) => {
  const {
    indices: snapshotIndices,
    includeGlobalState: snapshotIncludeGlobalState,
  } = snapshotDetails;

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
      checked:
        isAllIndices || (restoreIndices && restoreIndices.includes(index)) ? 'on' : undefined,
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
    <div className="snapshotRestore__restoreForm__stepLogistics">
      {/* Step title and doc link */}
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle>
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.restoreForm.stepLogisticsTitle"
                defaultMessage="Logistics"
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.snapshotRestore.restoreForm.stepLogisticsDescription"
                defaultMessage="Define indices to restore and overall restore settings."
              />
            </p>
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            flush="right"
            href={documentationLinksService.getRestoreDocUrl()}
            target="_blank"
            iconType="help"
          >
            <FormattedMessage
              id="xpack.rollupJobs.create.stepLogistics.docsButtonLabel"
              defaultMessage="Logistics docs"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />

      {/* Indices */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.restoreForm.stepLogistics.indicesTitle"
                defaultMessage="Indices"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.restoreForm.stepLogistics.indicesDescription"
            defaultMessage="The restore operation creates new indices if they do not exist.
              Existing indices can only be restored if it's closed and has the same number of shards as
              the index in the snapshot."
          />
        }
        idAria="stepLogisticsIndicesDescription"
        fullWidth
      >
        <EuiFormRow
          hasEmptyLabelSpace
          fullWidth
          describedByIds={['stepLogisticsIndicesDescription']}
        >
          {/* Fragment needed because EuiFormRow can only have one child: https://github.com/elastic/eui/issues/1931 */}
          <Fragment>
            <EuiSwitch
              label={
                <FormattedMessage
                  id="xpack.snapshotRestore.restoreForm.stepLogistics.allIndicesLabel"
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
                      id="xpack.snapshotRestore.restoreForm.stepLogistics.selectIndicesLabel"
                      defaultMessage="Select indices"
                    />
                  }
                  helpText={
                    <FormattedMessage
                      id="xpack.snapshotRestore.restoreForm.stepLogistics.selectIndicesHelpText"
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

      {/* Rename indices */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.restoreForm.stepLogistics.renameIndicesTitle"
                defaultMessage="Rename indices"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.restoreForm.stepLogistics.renameIndicesDescription"
            defaultMessage="Rename indices when they are restored."
          />
        }
        idAria="stepLogisticsRenameIndicesDescription"
        fullWidth
      >
        <EuiFormRow
          hasEmptyLabelSpace
          fullWidth
          describedByIds={['stepLogisticsRenameIndicesDescription']}
        >
          {/* Fragment needed because EuiFormRow can only have one child: https://github.com/elastic/eui/issues/1931 */}
          <Fragment>
            <EuiSwitch
              label={
                <FormattedMessage
                  id="xpack.snapshotRestore.restoreForm.stepLogistics.renameIndicesLabel"
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
                          id="xpack.snapshotRestore.restoreForm.stepLogistics.renamePatternLabel"
                          defaultMessage="Capture pattern"
                        />
                      }
                      helpText={
                        <FormattedMessage
                          id="xpack.snapshotRestore.restoreForm.stepLogistics.renamePatternHelpText"
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
                          id="xpack.snapshotRestore.restoreForm.stepLogistics.renameReplacementLabel"
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

      {/* Partial restore */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.restoreForm.stepLogistics.partialTitle"
                defaultMessage="Partial restore"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.restoreForm.stepLogistics.partialDescription"
            defaultMessage="Allow restore of indices that don't have snapshots of all shards."
          />
        }
        idAria="stepLogisticsPartialDescription"
        fullWidth
      >
        <EuiFormRow
          hasEmptyLabelSpace={true}
          fullWidth
          describedByIds={['stepLogisticsPartialDescription']}
        >
          <EuiSwitch
            label={
              <FormattedMessage
                id="xpack.snapshotRestore.restoreForm.stepLogistics.partialLabel"
                defaultMessage="Ignore unavailable indices"
              />
            }
            checked={partial === undefined ? false : partial}
            onChange={e => updateRestoreSettings({ partial: e.target.checked })}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>

      {/* Include global state */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.restoreForm.stepLogistics.includeGlobalStateTitle"
                defaultMessage="Include global state"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.restoreForm.stepLogistics.includeGlobalStateDescription"
            defaultMessage="Restored templates that don't currently exist in the cluster are added
              and existing templates with the same name are overriden by the restored templates.
              Restored persistent settings are added to the existing persistent settings."
          />
        }
        idAria="stepLogisticsIncludeGlobalStateDescription"
        fullWidth
      >
        <EuiFormRow
          hasEmptyLabelSpace={true}
          fullWidth
          describedByIds={['stepLogisticsIncludeGlobalStateDescription']}
          helpText={
            snapshotIncludeGlobalState ? null : (
              <FormattedMessage
                id="xpack.snapshotRestore.restoreForm.stepLogistics.includeGlobalStateDisabledDescription"
                defaultMessage="Global state is not available in this snapshot"
              />
            )
          }
        >
          <EuiSwitch
            label={
              <FormattedMessage
                id="xpack.snapshotRestore.restoreForm.stepLogistics.includeGlobalStateLabel"
                defaultMessage="Include global state"
              />
            }
            checked={includeGlobalState === undefined ? false : includeGlobalState}
            onChange={e => updateRestoreSettings({ includeGlobalState: e.target.checked })}
            disabled={!snapshotIncludeGlobalState}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    </div>
  );
};
