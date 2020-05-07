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
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  EuiText,
  EuiTextColor,
  EuiButtonIcon,
  EuiHorizontalRule,
  EuiSpacer,
  EuiIconTip,
} from '@elastic/eui';
import { DatasourceInput, DatasourceInputStream, RegistryInput } from '../../../../types';
import { DatasourceInputValidationResults, validationHasErrors } from '../services';
import { DatasourceInputConfig } from './datasource_input_config';
import { DatasourceInputStreamConfig } from './datasource_input_stream_config';

const FlushHorizontalRule = styled(EuiHorizontalRule)`
  margin-left: -${props => props.theme.eui.paddingSizes.m};
  margin-right: -${props => props.theme.eui.paddingSizes.m};
  width: auto;
`;

export const DatasourceInputPanel: React.FunctionComponent<{
  packageInput: RegistryInput;
  datasourceInput: DatasourceInput;
  updateDatasourceInput: (updatedInput: Partial<DatasourceInput>) => void;
  inputValidationResults: DatasourceInputValidationResults;
  forceShowErrors?: boolean;
}> = ({
  packageInput,
  datasourceInput,
  updateDatasourceInput,
  inputValidationResults,
  forceShowErrors,
}) => {
  // Showing streams toggle state
  const [isShowingStreams, setIsShowingStreams] = useState<boolean>(false);

  // Errors state
  const hasErrors = forceShowErrors && validationHasErrors(inputValidationResults);

  return (
    <EuiPanel>
      {/* Header / input-level toggle */}
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiSwitch
            label={
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiText>
                    <h4>
                      <EuiTextColor color={hasErrors ? 'danger' : 'default'}>
                        {packageInput.title || packageInput.type}
                      </EuiTextColor>
                    </h4>
                  </EuiText>
                </EuiFlexItem>
                {hasErrors ? (
                  <EuiFlexItem grow={false}>
                    <EuiIconTip
                      content={
                        <FormattedMessage
                          id="xpack.ingestManager.createDatasource.stepConfigure.inputLevelErrorsTooltip"
                          defaultMessage="Fix configuration errors"
                        />
                      }
                      position="right"
                      type="alert"
                      iconProps={{ color: 'danger' }}
                    />
                  </EuiFlexItem>
                ) : null}
              </EuiFlexGroup>
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

      {/* Header rule break */}
      {isShowingStreams ? <FlushHorizontalRule margin="m" /> : null}

      {/* Input level configuration */}
      {isShowingStreams && packageInput.vars && packageInput.vars.length ? (
        <Fragment>
          <DatasourceInputConfig
            packageInputVars={packageInput.vars}
            datasourceInput={datasourceInput}
            updateDatasourceInput={updateDatasourceInput}
            inputVarsValidationResults={{ vars: inputValidationResults.vars }}
            forceShowErrors={forceShowErrors}
          />
          <EuiHorizontalRule margin="m" />
        </Fragment>
      ) : null}

      {/* Per-stream configuration */}
      {isShowingStreams ? (
        <EuiFlexGroup direction="column">
          {packageInput.streams.map(packageInputStream => {
            const datasourceInputStream = datasourceInput.streams.find(
              stream => stream.dataset === packageInputStream.dataset
            );
            return datasourceInputStream ? (
              <EuiFlexItem key={packageInputStream.dataset}>
                <DatasourceInputStreamConfig
                  packageInputStream={packageInputStream}
                  datasourceInputStream={datasourceInputStream}
                  updateDatasourceInputStream={(updatedStream: Partial<DatasourceInputStream>) => {
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
                  inputStreamValidationResults={
                    inputValidationResults.streams![datasourceInputStream.id]
                  }
                  forceShowErrors={forceShowErrors}
                />
                <EuiSpacer size="m" />
                <EuiHorizontalRule margin="none" />
              </EuiFlexItem>
            ) : null;
          })}
        </EuiFlexGroup>
      ) : null}
    </EuiPanel>
  );
};
