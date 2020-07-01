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

import { SlmPolicyPayload } from '../../../../../../../../common/types';
import { useServices } from '../../../../../../app_context';
import { PolicyValidation } from '../../../../../../services/validation';

import { orderDataStreamsAndIndices, DataStreamBadge } from '../../../../../shared';

import { mapSelectionToIndicesOptions, determineListMode } from './helpers';

interface Props {
  isManagedPolicy: boolean;
  policy: SlmPolicyPayload;
  indices: string[];
  dataStreams: string[];
  onUpdate: (arg: { indices?: string[] | string }) => void;
  errors: PolicyValidation['errors'];
}

/**
 * In future we may be able to split data streams to it's own field, but for now
 * they share an array "indices" in the snapshot lifecycle policy config. See
 * this github issue for progress: https://github.com/elastic/elasticsearch/issues/58474
 */
export const IndicesAndDataStreamsField: FunctionComponent<Props> = ({
  isManagedPolicy,
  dataStreams,
  indices,
  policy,
  onUpdate,
  errors,
}) => {
  const { i18n } = useServices();
  const { config = {} } = policy;

  const indicesAndDataStreams = indices.concat(dataStreams);

  // We assume all indices if the config has no indices entry or if we receive an empty array
  const [isAllIndices, setIsAllIndices] = useState<boolean>(
    !config.indices || (Array.isArray(config.indices) && config.indices.length === 0)
  );

  const [indicesSelection, setIndicesSelection] = useState<string[]>(() =>
    Array.isArray(config.indices) && !isAllIndices
      ? indicesAndDataStreams.filter((i) => (config.indices! as string[]).includes(i))
      : [...indicesAndDataStreams]
  );

  // States for choosing all indices, or a subset, including caching previously chosen subset list
  const [indicesOptions, setIndicesOptions] = useState<EuiSelectableOption[]>(() =>
    mapSelectionToIndicesOptions({
      selection: indicesSelection,
      dataStreams,
      indices,
      allSelected: isAllIndices || typeof config.indices === 'string',
    })
  );

  // State for using selectable indices list or custom patterns
  const [selectIndicesMode, setSelectIndicesMode] = useState<'list' | 'custom'>(() =>
    determineListMode({ configuredIndices: config.indices, dataStreams, indices })
  );

  // State for custom patterns
  const [indexPatterns, setIndexPatterns] = useState<string[]>(() =>
    typeof config.indices === 'string'
      ? (config.indices as string).split(',')
      : Array.isArray(config.indices) && config.indices
      ? config.indices
      : []
  );

  const indicesSwitch = (
    <EuiSwitch
      label={
        <FormattedMessage
          id="xpack.snapshotRestore.policyForm.stepSettings.allDataStreamsAndIndicesLabel"
          defaultMessage="All data streams and indices, including system indices"
        />
      }
      checked={isAllIndices}
      disabled={isManagedPolicy}
      data-test-subj="allIndicesToggle"
      onChange={(e) => {
        const isChecked = e.target.checked;
        setIsAllIndices(isChecked);
        if (isChecked) {
          setIndicesSelection(indicesAndDataStreams);
          setIndicesOptions(
            mapSelectionToIndicesOptions({
              allSelected: isAllIndices || typeof config.indices === 'string',
              dataStreams,
              indices,
              selection: indicesSelection,
            })
          );
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
              id="xpack.snapshotRestore.policyForm.stepSettings.dataStreamsAndIndicesTitle"
              defaultMessage="Data streams and indices"
            />
          </h3>
        </EuiTitle>
      }
      description={
        <FormattedMessage
          id="xpack.snapshotRestore.policyForm.stepSettings.dataStreamsAndIndicesDescription"
          defaultMessage="Data streams and indices to back up."
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
                          defaultMessage="Select indices and data streams"
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
                    data-test-subj="indicesAndDataStreamsList"
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
                    options={orderDataStreamsAndIndices({
                      indices: indices.map((index) => ({
                        label: index,
                        value: { isDataStream: false },
                      })),
                      dataStreams: dataStreams.map((dataStream) => ({
                        label: dataStream,
                        value: { isDataStream: true },
                      })),
                    })}
                    renderOption={({ label, value }) => {
                      if (value?.isDataStream) {
                        return (
                          <EuiFlexGroup
                            responsive={false}
                            justifyContent="spaceBetween"
                            alignItems="center"
                          >
                            <EuiFlexItem grow={false}>{label}</EuiFlexItem>
                            <EuiFlexItem grow={false}>
                              <DataStreamBadge />
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        );
                      }
                      return label;
                    }}
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
