/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FunctionComponent, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

import {
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

import { SlmPolicyPayload, SnapshotConfig } from '../../../../../../../common/types';
import { PolicyValidation } from '../../../../../services/validation';
import { indicesToArray } from '../../../../../../../common/lib';

interface Props {
  isManagedPolicy: boolean;
  policy: SlmPolicyPayload;
  dataStreams: string[];
  onUpdate: (arg: { dataStreams?: string[] | string }) => void;
  errors: PolicyValidation['errors'];
}

const hasSelectedSubsetOfDataStreams = (dataStreams: string[], selectedDataStreams: string[]) => {
  return selectedDataStreams.length && dataStreams.length > selectedDataStreams.length;
};

const getArrayOfSelectedDataStreams = (
  dataStreams: string[],
  indices?: string[] | string
): string[] => {
  const arrayOfIndices = indicesToArray(indices);
  return dataStreams.filter((d) => {
    return arrayOfIndices.some((i) => i.startsWith(d));
  });
};

export const DataStreamsField: FunctionComponent<Props> = ({
  isManagedPolicy,
  dataStreams,
  policy,
  onUpdate,
  errors,
}) => {
  const arrayOfSelectedDataStreams = getArrayOfSelectedDataStreams(
    dataStreams,
    policy.config?.indices
  );
  const { config = {} } = policy;
  const [isAllDataStreams, setIsAllDataStreams] = useState<boolean>(
    () => !hasSelectedSubsetOfDataStreams(dataStreams, arrayOfSelectedDataStreams)
  );
  const [dataStreamsSelection, setDataStreamsSelection] = useState<SnapshotConfig['indices']>([
    ...dataStreams,
  ]);

  // States for choosing all data streams, or a subset, including caching previously chosen subset list
  const [dataStreamOptions, setDataStreamOptions] = useState<EuiSelectableOption[]>(() => {
    return dataStreams.map(
      (dataStream): EuiSelectableOption => ({
        label: dataStream,
        checked:
          isAllDataStreams ||
          // If indices is a string, we default to custom input mode, so we mark individual data streams
          // as selected if user goes back to list mode
          typeof config.indices === 'string' ||
          arrayOfSelectedDataStreams.includes(dataStream)
            ? 'on'
            : undefined,
      })
    );
  });

  const dataStreamsSwitch = (
    <EuiSwitch
      label={
        <FormattedMessage
          id="xpack.snapshotRestore.policyForm.stepSettings.allDataStreamsLabel"
          defaultMessage="All data streams"
        />
      }
      checked={isAllDataStreams}
      disabled={isManagedPolicy}
      data-test-subj="allIndicesToggle"
      onChange={(e) => {
        const isChecked = e.target.checked;
        setIsAllDataStreams(isChecked);
        if (isChecked) {
          onUpdate({ dataStreams: undefined });
        } else {
          onUpdate({
            dataStreams: [...(dataStreamsSelection || [])],
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
              id="xpack.snapshotRestore.policyForm.stepSettings.dataStreamsTitle"
              defaultMessage="Data Streams"
            />
          </h3>
        </EuiTitle>
      }
      description={
        <FormattedMessage
          id="xpack.snapshotRestore.policyForm.stepSettings.dataStreamsDescription"
          defaultMessage="Data streams to back up."
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
                    id="xpack.snapshotRestore.policyForm.stepSettings.dataStreamsTooltip"
                    defaultMessage="Cloud-managed policies require all data streams."
                  />
                </p>
              }
            >
              {dataStreamsSwitch}
            </EuiToolTip>
          ) : (
            dataStreamsSwitch
          )}
          {isAllDataStreams ? null : (
            <Fragment>
              <EuiSpacer size="m" />
              <EuiFormRow
                className="snapshotRestore__policyForm__stepSettings__indicesFieldWrapper"
                label={
                  <EuiFlexGroup justifyContent="spaceBetween">
                    <EuiFlexItem grow={false}>
                      <FormattedMessage
                        id="xpack.snapshotRestore.policyForm.stepSettings.selectDataStreamsLabel"
                        defaultMessage="Select data streams"
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                }
                helpText={
                  <FormattedMessage
                    id="xpack.snapshotRestore.policyForm.stepSettings.selectDataStreamsHelpText"
                    defaultMessage="{count} {count, plural, one {data stream} other {data streams}} will be backed up. {selectOrDeselectAllLink}"
                    values={{
                      count: arrayOfSelectedDataStreams.length,
                      selectOrDeselectAllLink:
                        arrayOfSelectedDataStreams.length > 0 ? (
                          <EuiLink
                            data-test-subj="deselectDataStreamLink"
                            onClick={() => {
                              // TODO: Change this to setDataStreamOptions() when https://github.com/elastic/eui/issues/2071 is fixed
                              dataStreamOptions.forEach((option: EuiSelectableOption) => {
                                option.checked = undefined;
                              });
                              onUpdate({ dataStreams: [] });
                              setDataStreamsSelection([]);
                            }}
                          >
                            <FormattedMessage
                              id="xpack.snapshotRestore.policyForm.stepSettings.deselectAllDataStreamsLink"
                              defaultMessage="Deselect all"
                            />
                          </EuiLink>
                        ) : (
                          <EuiLink
                            onClick={() => {
                              // TODO: Change this to setDataStreamOptions() when https://github.com/elastic/eui/issues/2071 is fixed
                              dataStreamOptions.forEach((option: EuiSelectableOption) => {
                                option.checked = 'on';
                              });
                              onUpdate({ dataStreams: [...dataStreams] });
                              setDataStreamsSelection([...dataStreams]);
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
                }
                isInvalid={Boolean(errors.indices)}
                error={errors.indices}
              >
                {
                  <EuiSelectable
                    allowExclusions={false}
                    options={dataStreamOptions}
                    onChange={(options) => {
                      const newSelectedDataStreams: string[] = [];
                      options.forEach(({ label, checked }) => {
                        if (checked === 'on') {
                          newSelectedDataStreams.push(label);
                        }
                      });
                      setDataStreamOptions(options);
                      onUpdate({ dataStreams: newSelectedDataStreams });
                      setDataStreamsSelection(newSelectedDataStreams);
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
                }
              </EuiFormRow>
            </Fragment>
          )}
        </Fragment>
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
};
