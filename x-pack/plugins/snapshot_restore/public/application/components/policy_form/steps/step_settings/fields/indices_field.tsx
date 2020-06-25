/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FunctionComponent, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiComboBox,
  EuiDescribedFormGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLink,
  EuiPanel,
  EuiSelectable,
  EuiSelectableOption,
  EuiSpacer,
  EuiSwitch,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';

import { SlmPolicyPayload } from '../../../../../../../common/types';
import { useServices } from '../../../../../app_context';
import { PolicyValidation } from '../../../../../services/validation';

interface Props {
  isManagedPolicy: boolean;
  policy: SlmPolicyPayload;
  indices: string[];
  onUpdate: (arg: { indices?: string[] | string }) => void;
  errors: PolicyValidation['errors'];
}

export const IndicesField: FunctionComponent<Props> = ({
  isManagedPolicy,
  indices,
  policy,
  onUpdate,
  errors,
}) => {
  const { i18n } = useServices();
  const { config = {} } = policy;

  // We assume all indices if the config has no indices entry or if we receive an empty array
  const [isAllIndices, setIsAllIndices] = useState<boolean>(
    !config.indices || (Array.isArray(config.indices) && config.indices.length === 0)
  );
  const [indicesSelection, setIndicesSelection] = useState<string[]>(() =>
    Array.isArray(config.indices) && !isAllIndices
      ? indices.filter((i) => (config.indices! as string[]).includes(i))
      : [...indices]
  );

  // States for choosing all indices, or a subset, including caching previously chosen subset list
  const [indicesOptions, setIndicesOptions] = useState<EuiSelectableOption[]>(() =>
    indices.map(
      (index): EuiSelectableOption => {
        return {
          label: index,
          checked:
            isAllIndices ||
            // If indices is a string, we default to custom input mode, so we mark individual indices
            // as selected if user goes back to list mode
            typeof config.indices === 'string' ||
            indicesSelection.includes(index)
              ? 'on'
              : undefined,
        };
      }
    )
  );

  // State for using selectable indices list or custom patterns
  // Users with more than 100 indices will probably want to use an index pattern to select
  // them instead, so we'll default to showing them the index pattern input. Also show the custom
  // list if we have no exact matches in the configured array to some existing index.
  const [selectIndicesMode, setSelectIndicesMode] = useState<'list' | 'custom'>(() =>
    typeof config.indices === 'string' ||
    (Array.isArray(config.indices) &&
      (config.indices.length > 100 || !config.indices.every((c) => indices.some((i) => i === c))))
      ? 'custom'
      : 'list'
  );

  // State for custom patterns
  const [indexPatterns, setIndexPatterns] = useState<string[]>(() =>
    typeof config.indices === 'string'
      ? (config.indices as string).split(',')
      : Array.isArray(config.indices)
      ? config.indices
      : []
  );

  const indicesSwitch = (
    <EuiSwitch
      label={
        <FormattedMessage
          id="xpack.snapshotRestore.policyForm.stepSettings.allIndicesLabel"
          defaultMessage="All indices, including system indices"
        />
      }
      checked={isAllIndices}
      disabled={isManagedPolicy}
      data-test-subj="allIndicesToggle"
      onChange={(e) => {
        const isChecked = e.target.checked;
        setIsAllIndices(isChecked);
        if (isChecked) {
          onUpdate({ indices: undefined });
        } else {
          onUpdate({
            indices:
              selectIndicesMode === 'custom'
                ? indexPatterns.join(',')
                : [...(indicesSelection || [])],
          });
        }
      }}
    />
  );

  return (
    <EuiDescribedFormGroup
      title={
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.snapshotRestore.policyForm.stepSettings.indicesTitle"
              defaultMessage="Indices"
            />
          </h3>
        </EuiTitle>
      }
      description={
        <FormattedMessage
          id="xpack.snapshotRestore.policyForm.stepSettings.indicesDescription"
          defaultMessage="Indices to back up."
        />
      }
      fullWidth
    >
      <EuiFormRow hasEmptyLabelSpace fullWidth>
        <Fragment>
          {isManagedPolicy ? (
            <EuiToolTip
              position="left"
              content={
                <p>
                  <FormattedMessage
                    id="xpack.snapshotRestore.policyForm.stepSettings.indicesTooltip"
                    defaultMessage="Cloud-managed policies require all indices."
                  />
                </p>
              }
            >
              {indicesSwitch}
            </EuiToolTip>
          ) : (
            indicesSwitch
          )}
          {isAllIndices ? null : (
            <Fragment>
              <EuiSpacer size="m" />
              <EuiFormRow
                className="snapshotRestore__policyForm__stepSettings__indicesFieldWrapper"
                label={
                  selectIndicesMode === 'list' ? (
                    <EuiFlexGroup justifyContent="spaceBetween">
                      <EuiFlexItem grow={false}>
                        <FormattedMessage
                          id="xpack.snapshotRestore.policyForm.stepSettings.selectIndicesLabel"
                          defaultMessage="Select indices"
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiLink
                          onClick={() => {
                            setSelectIndicesMode('custom');
                            onUpdate({ indices: indexPatterns.join(',') });
                          }}
                        >
                          <FormattedMessage
                            id="xpack.snapshotRestore.policyForm.stepSettings.indicesToggleCustomLink"
                            defaultMessage="Use index patterns"
                          />
                        </EuiLink>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  ) : (
                    <EuiFlexGroup justifyContent="spaceBetween">
                      <EuiFlexItem grow={false}>
                        <FormattedMessage
                          id="xpack.snapshotRestore.policyForm.stepSettings.indicesPatternLabel"
                          defaultMessage="Index patterns"
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiLink
                          data-test-subj="selectIndicesLink"
                          onClick={() => {
                            setSelectIndicesMode('list');
                            onUpdate({ indices: indicesSelection });
                          }}
                        >
                          <FormattedMessage
                            id="xpack.snapshotRestore.policyForm.stepSettings.indicesToggleListLink"
                            defaultMessage="Select indices"
                          />
                        </EuiLink>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  )
                }
                helpText={
                  selectIndicesMode === 'list' ? (
                    <FormattedMessage
                      id="xpack.snapshotRestore.policyForm.stepSettings.selectIndicesHelpText"
                      defaultMessage="{count} {count, plural, one {index} other {indices}} will be backed up. {selectOrDeselectAllLink}"
                      values={{
                        count: config.indices && config.indices.length,
                        selectOrDeselectAllLink:
                          config.indices && config.indices.length > 0 ? (
                            <EuiLink
                              data-test-subj="deselectIndicesLink"
                              onClick={() => {
                                // TODO: Change this to setIndicesOptions() when https://github.com/elastic/eui/issues/2071 is fixed
                                indicesOptions.forEach((option: EuiSelectableOption) => {
                                  option.checked = undefined;
                                });
                                onUpdate({ indices: [] });
                                setIndicesSelection([]);
                              }}
                            >
                              <FormattedMessage
                                id="xpack.snapshotRestore.policyForm.stepSettings.deselectAllIndicesLink"
                                defaultMessage="Deselect all"
                              />
                            </EuiLink>
                          ) : (
                            <EuiLink
                              onClick={() => {
                                // TODO: Change this to setIndicesOptions() when https://github.com/elastic/eui/issues/2071 is fixed
                                indicesOptions.forEach((option: EuiSelectableOption) => {
                                  option.checked = 'on';
                                });
                                onUpdate({ indices: [...indices] });
                                setIndicesSelection([...indices]);
                              }}
                            >
                              <FormattedMessage
                                id="xpack.snapshotRestore.policyForm.stepSettings.selectAllIndicesLink"
                                defaultMessage="Select all"
                              />
                            </EuiLink>
                          ),
                      }}
                    />
                  ) : null
                }
                isInvalid={Boolean(errors.indices)}
                error={errors.indices}
              >
                {selectIndicesMode === 'list' ? (
                  <EuiSelectable
                    allowExclusions={false}
                    options={indicesOptions}
                    onChange={(options) => {
                      const newSelectedIndices: string[] = [];
                      options.forEach(({ label, checked }) => {
                        if (checked === 'on') {
                          newSelectedIndices.push(label);
                        }
                      });
                      setIndicesOptions(options);
                      onUpdate({ indices: newSelectedIndices });
                      setIndicesSelection(newSelectedIndices);
                    }}
                    searchable
                    height={300}
                  >
                    {(list, search) => (
                      <EuiPanel paddingSize="s" hasShadow={false}>
                        {search}
                        {list}
                      </EuiPanel>
                    )}
                  </EuiSelectable>
                ) : (
                  <EuiComboBox
                    options={indices.map((index) => ({ label: index }))}
                    placeholder={i18n.translate(
                      'xpack.snapshotRestore.policyForm.stepSettings.indicesPatternPlaceholder',
                      {
                        defaultMessage: 'Enter index patterns, i.e. logstash-*',
                      }
                    )}
                    selectedOptions={indexPatterns.map((pattern) => ({ label: pattern }))}
                    onCreateOption={(pattern: string) => {
                      if (!pattern.trim().length) {
                        return;
                      }
                      const newPatterns = [...indexPatterns, pattern];
                      setIndexPatterns(newPatterns);
                      onUpdate({
                        indices: newPatterns.join(','),
                      });
                    }}
                    onChange={(patterns: Array<{ label: string }>) => {
                      const newPatterns = patterns.map(({ label }) => label);
                      setIndexPatterns(newPatterns);
                      onUpdate({
                        indices: newPatterns.join(','),
                      });
                    }}
                  />
                )}
              </EuiFormRow>
            </Fragment>
          )}
        </Fragment>
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
};
