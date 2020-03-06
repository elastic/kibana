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
} from '@elastic/eui';
import { DatasourceInput, DatasourceInputStream } from '../../../../types';
import { DatasourceInputConfig } from './datasource_input_config';
import { DatasourceInputStreamConfig } from './datasource_input_stream_config';

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

      {/* Header rule break */}
      {isShowingStreams ? <FlushHorizontalRule margin="m" /> : null}

      {/* Input level configuration */}
      {isShowingStreams && packageInput.vars && packageInput.vars.length ? (
        <Fragment>
          <DatasourceInputConfig
            packageInputVars={packageInput.vars}
            datasourceInput={datasourceInput}
            updateDatasourceInput={updateDatasourceInput}
          />
          <EuiHorizontalRule margin="m" />
        </Fragment>
      ) : null}

      {/* Per-stream configuration */}
      {isShowingStreams ? (
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
