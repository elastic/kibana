/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, Fragment } from 'react';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiPanel,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  EuiText,
  EuiTextColor,
  EuiButtonIcon,
  EuiHorizontalRule,
  EuiSpacer,
  EuiFormRow,
  EuiFieldText,
  EuiComboBox,
  EuiButtonEmpty,
} from '@elastic/eui';
import { DatasourceInput, DatasourceInputStream } from '../../../../types';

const FlushHorizontalRule = styled(EuiHorizontalRule)`
  margin-left: -${props => props.theme.eui.paddingSizes.m};
  margin-right: -${props => props.theme.eui.paddingSizes.m};
  width: auto;
`;

export const DatasourceInputPanel: React.FunctionComponent<{
  packageInput: any; // TODO: Type this correctly
  datasourceInput: DatasourceInput;
  updateDatasourceInput: (updatedInput: Partial<DatasourceInput>) => void;
}> = ({ packageInput, datasourceInput, updateDatasourceInput }) => {
  // Showing streams toggle state
  const [isShowingStreams, setIsShowingStreams] = useState<boolean>(false);

  return (
    <EuiPanel>
      {/* Header / input-level toggle */}
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiSwitch
            label={
              <EuiText>
                <h4>{packageInput.description || packageInput.type}</h4>
              </EuiText>
            }
            checked={datasourceInput.enabled}
            onChange={e => {
              const enabled = e.target.checked;
              updateDatasourceInput({
                enabled,
                streams: datasourceInput.streams.map(stream => ({
                  ...stream,
                  enabled,
                })),
              });
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem>
              <EuiText color="subdued">
                <FormattedMessage
                  id="xpack.ingestManager.createDatasource.stepConfigure.streamsEnabledCountText"
                  defaultMessage="{count} / {total, plural, one {# stream} other {# streams}} enabled"
                  values={{
                    count: (
                      <EuiTextColor color="default">
                        <strong>
                          {datasourceInput.streams.filter(stream => stream.enabled).length}
                        </strong>
                      </EuiTextColor>
                    ),
                    total: packageInput.streams.length,
                  }}
                />
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType={isShowingStreams ? 'arrowUp' : 'arrowDown'}
                onClick={() => setIsShowingStreams(!isShowingStreams)}
                color="text"
                aria-label={
                  isShowingStreams
                    ? i18n.translate(
                        'xpack.ingestManager.createDatasource.stepConfigure.hideStreamsAriaLabel',
                        {
                          defaultMessage: 'Hide {type} streams',
                          values: {
                            type: packageInput.type,
                          },
                        }
                      )
                    : i18n.translate(
                        'xpack.ingestManager.createDatasource.stepConfigure.showStreamsAriaLabel',
                        {
                          defaultMessage: 'Show {type} streams',
                          values: {
                            type: packageInput.type,
                          },
                        }
                      )
                }
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      {/* Per-stream configuration */}
      {isShowingStreams ? (
        <Fragment>
          <FlushHorizontalRule margin="m" />
          <EuiFlexGroup direction="column">
            {packageInput.streams.map((packageInputStream: any) => {
              const datasourceInputStream = datasourceInput.streams.find(
                stream => stream.dataset === packageInputStream.dataset
              );
              return datasourceInputStream ? (
                <EuiFlexItem key={packageInputStream.dataset}>
                  <DatasourceInputStreamConfig
                    packageInputStream={packageInputStream}
                    datasourceInputStream={datasourceInputStream}
                    updateDatasourceInputStream={(
                      updatedStream: Partial<DatasourceInputStream>
                    ) => {
                      const indexOfUpdatedStream = datasourceInput.streams.findIndex(
                        stream => stream.dataset === packageInputStream.dataset
                      );
                      const newStreams = [...datasourceInput.streams];
                      newStreams[indexOfUpdatedStream] = {
                        ...newStreams[indexOfUpdatedStream],
                        ...updatedStream,
                      };

                      const updatedInput: Partial<DatasourceInput> = {
                        streams: newStreams,
                      };

                      // Update input enabled state if needed
                      if (!datasourceInput.enabled && updatedStream.enabled) {
                        updatedInput.enabled = true;
                      } else if (
                        datasourceInput.enabled &&
                        !newStreams.find(stream => stream.enabled)
                      ) {
                        updatedInput.enabled = false;
                      }

                      updateDatasourceInput(updatedInput);
                    }}
                  />
                  <EuiSpacer size="m" />
                  <EuiHorizontalRule margin="none" />
                </EuiFlexItem>
              ) : null;
            })}
          </EuiFlexGroup>
        </Fragment>
      ) : null}
    </EuiPanel>
  );
};

const DatasourceInputStreamConfig: React.FunctionComponent<{
  packageInputStream: any; // TODO: Type this correctly
  datasourceInputStream: DatasourceInputStream;
  updateDatasourceInputStream: (updatedStream: Partial<DatasourceInputStream>) => void;
}> = ({ packageInputStream, datasourceInputStream, updateDatasourceInputStream }) => {
  // Showing advanced options toggle state
  const [isShowingAdvanced, setIsShowingAdvanced] = useState<boolean>(false);

  const requiredVars: any[] = [];
  const advancedVars: any[] = [];

  if (packageInputStream.vars && packageInputStream.vars.length) {
    packageInputStream.vars.forEach((varDef: any) => {
      if (varDef.required && !varDef.default) {
        requiredVars.push(varDef);
      } else {
        advancedVars.push(varDef);
      }
    });
  }

  return (
    <EuiFlexGrid columns={2}>
      <EuiFlexItem>
        <EuiSwitch
          label={packageInputStream.dataset}
          checked={datasourceInputStream.enabled}
          onChange={e => {
            const enabled = e.target.checked;
            updateDatasourceInputStream({
              enabled,
            });
          }}
        />
        {packageInputStream.description ? (
          <Fragment>
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">
              <p>{packageInputStream.description}</p>
            </EuiText>
          </Fragment>
        ) : null}
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup direction="column" gutterSize="s">
          {requiredVars.map(varDef => {
            const varName = varDef.name;
            const value = datasourceInputStream.config![varName];
            return (
              <EuiFlexItem key={varName}>
                <DatasourceVarInputField
                  varDef={varDef}
                  value={value}
                  onChange={(newValue: any) => {
                    updateDatasourceInputStream({
                      config: {
                        ...datasourceInputStream.config,
                        [varName]: newValue,
                      },
                    });
                  }}
                />
              </EuiFlexItem>
            );
          })}
          {advancedVars.length ? (
            <Fragment>
              <EuiFlexItem>
                {/* Wrapper div to prevent button from going full width */}
                <div>
                  <EuiButtonEmpty
                    size="s"
                    iconType={isShowingAdvanced ? 'arrowDown' : 'arrowRight'}
                    onClick={() => setIsShowingAdvanced(!isShowingAdvanced)}
                    flush="left"
                  >
                    <FormattedMessage
                      id="xpack.ingestManager.createDatasource.stepConfigure.toggleAdvancedOptionsButtonText"
                      defaultMessage="Advanced options"
                    />
                  </EuiButtonEmpty>
                </div>
              </EuiFlexItem>
              {isShowingAdvanced
                ? advancedVars.map(varDef => {
                    const varName = varDef.name;
                    const value = datasourceInputStream.config![varName];
                    return (
                      <EuiFlexItem key={varName}>
                        <DatasourceVarInputField
                          varDef={varDef}
                          value={value}
                          onChange={(newValue: any) => {
                            updateDatasourceInputStream({
                              config: {
                                ...datasourceInputStream.config,
                                [varName]: newValue,
                              },
                            });
                          }}
                        />
                      </EuiFlexItem>
                    );
                  })
                : null}
            </Fragment>
          ) : null}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGrid>
  );
};

const DatasourceVarInputField: React.FunctionComponent<{
  varDef: any; // TODO: Type this correctly
  value: any;
  onChange: (newValue: any) => void;
}> = ({ varDef, value, onChange }) => {
  return (
    <EuiFormRow label={varDef.name} helpText={varDef.description}>
      {varDef.multi ? (
        <EuiComboBox
          noSuggestions
          selectedOptions={value.map((val: string) => ({ label: val }))}
          onCreateOption={(newVal: any) => {
            // debugger;
            onChange([...value, newVal]);
          }}
          onChange={(newVals: any[]) => {
            // debugger;
            onChange(newVals.map(val => val.label));
          }}
        />
      ) : (
        <EuiFieldText value={value} onChange={e => onChange(e.target.value)} />
      )}
    </EuiFormRow>
  );
};
