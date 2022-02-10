/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, FunctionComponent, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

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
import { PolicyValidation, ValidatePolicyHelperData } from '../../../../../../services/validation';

import { orderDataStreamsAndIndices } from '../../../../../lib';
import { DataStreamBadge } from '../../../../../data_stream_badge';

import { mapSelectionToIndicesOptions, determineListMode } from './helpers';

import { DataStreamsAndIndicesListHelpText } from './data_streams_and_indices_list_help_text';

interface IndicesConfig {
  indices?: string[] | string;
}

interface Props {
  isManagedPolicy: boolean;
  policy: SlmPolicyPayload;
  indices: string[];
  dataStreams: string[];
  onUpdate: (arg: IndicesConfig, validateHelperData: ValidatePolicyHelperData) => void;
  errors: PolicyValidation['errors'];
}

/**
 * In future we may be able to split data streams to its own field, but for now
 * they share an array "indices" in the snapshot lifecycle policy config. See
 * this github issue for progress: https://github.com/elastic/elasticsearch/issues/58474
 */
export const IndicesAndDataStreamsField: FunctionComponent<Props> = ({
  isManagedPolicy,
  dataStreams,
  indices,
  policy,
  onUpdate: _onUpdate,
  errors,
}) => {
  const { i18n } = useServices();
  const { config = {} } = policy;

  const indicesAndDataStreams = indices.concat(dataStreams);

  // We assume all indices if the config has no indices entry or if we receive an empty array
  const [isAllIndices, setIsAllIndices] = useState<boolean>(
    config.indices == null || (Array.isArray(config.indices) && config.indices.length === 0)
  );

  const onUpdate = (data: IndicesConfig) => {
    _onUpdate(data, {
      validateIndicesCount: !isAllIndices,
    });
  };

  const [indicesAndDataStreamsSelection, setIndicesAndDataStreamsSelection] = useState<string[]>(
    () =>
      Array.isArray(config.indices) && !isAllIndices
        ? indicesAndDataStreams.filter((i) => (config.indices! as string[]).includes(i))
        : [...indicesAndDataStreams]
  );

  // States for choosing all indices, or a subset, including caching previously chosen subset list
  const [indicesAndDataStreamsOptions, setIndicesAndDataStreamsOptions] = useState<
    EuiSelectableOption[]
  >(() =>
    mapSelectionToIndicesOptions({
      selection: indicesAndDataStreamsSelection,
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
          setIndicesAndDataStreamsSelection(indicesAndDataStreams);
          setIndicesAndDataStreamsOptions(
            mapSelectionToIndicesOptions({
              allSelected: isAllIndices || typeof config.indices === 'string',
              dataStreams,
              indices,
              selection: indicesAndDataStreamsSelection,
            })
          );
          onUpdate({ indices: undefined });
        } else {
          _onUpdate(
            {
              indices:
                selectIndicesMode === 'custom'
                  ? indexPatterns.join(',')
                  : [...(indicesAndDataStreamsSelection || [])],
            },
            {
              validateIndicesCount: true,
            }
          );
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
          defaultMessage="To back up indices and data streams, manually select them or define index patterns to dynamically match them."
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
                            onUpdate({ indices: indicesAndDataStreamsSelection });
                          }}
                        >
                          <FormattedMessage
                            id="xpack.snapshotRestore.policyForm.stepSettings.dataStreamsAndIndicesToggleListLink"
                            defaultMessage="Select data streams and indices"
                          />
                        </EuiLink>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  )
                }
                helpText={
                  selectIndicesMode === 'list' ? (
                    <DataStreamsAndIndicesListHelpText
                      onSelectionChange={(selection) => {
                        if (selection === 'all') {
                          // TODO: Change this to setIndicesOptions() when https://github.com/elastic/eui/issues/2071 is fixed
                          indicesAndDataStreamsOptions.forEach((option: EuiSelectableOption) => {
                            option.checked = 'on';
                          });
                          onUpdate({ indices: [...indicesAndDataStreams] });
                          setIndicesAndDataStreamsSelection([...indicesAndDataStreams]);
                        } else {
                          // TODO: Change this to setIndicesOptions() when https://github.com/elastic/eui/issues/2071 is fixed
                          indicesAndDataStreamsOptions.forEach((option: EuiSelectableOption) => {
                            option.checked = undefined;
                          });
                          onUpdate({ indices: [] });
                          setIndicesAndDataStreamsSelection([]);
                        }
                      }}
                      selectedIndicesAndDataStreams={indicesAndDataStreamsSelection}
                      indices={indices}
                      dataStreams={dataStreams}
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
                    options={indicesAndDataStreamsOptions}
                    onChange={(options) => {
                      const newSelectedIndices: string[] = [];
                      options.forEach(({ label, checked }) => {
                        if (checked === 'on') {
                          newSelectedIndices.push(label);
                        }
                      });
                      setIndicesAndDataStreamsOptions(options);
                      onUpdate({ indices: newSelectedIndices });
                      setIndicesAndDataStreamsSelection(newSelectedIndices);
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
