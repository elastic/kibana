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
import {
  PackageConfigInput,
  PackageConfigInputStream,
  RegistryInput,
  RegistryStream,
} from '../../../../types';
import { PackageConfigInputValidationResults, validationHasErrors } from '../services';
import { PackageConfigInputConfig } from './package_config_input_config';
import { PackageConfigInputStreamConfig } from './package_config_input_stream';

const FlushHorizontalRule = styled(EuiHorizontalRule)`
  margin-left: -${(props) => props.theme.eui.paddingSizes.m};
  margin-right: -${(props) => props.theme.eui.paddingSizes.m};
  width: auto;
`;

export const PackageConfigInputPanel: React.FunctionComponent<{
  packageInput: RegistryInput;
  packageInputStreams: Array<RegistryStream & { dataset: { name: string } }>;
  packageConfigInput: PackageConfigInput;
  updatePackageConfigInput: (updatedInput: Partial<PackageConfigInput>) => void;
  inputValidationResults: PackageConfigInputValidationResults;
  forceShowErrors?: boolean;
}> = ({
  packageInput,
  packageInputStreams,
  packageConfigInput,
  updatePackageConfigInput,
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
                          id="xpack.ingestManager.createPackageConfig.stepConfigure.inputLevelErrorsTooltip"
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
            checked={packageConfigInput.enabled}
            onChange={(e) => {
              const enabled = e.target.checked;
              updatePackageConfigInput({
                enabled,
                streams: packageConfigInput.streams.map((stream) => ({
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
                  id="xpack.ingestManager.createPackageConfig.stepConfigure.streamsEnabledCountText"
                  defaultMessage="{count} / {total, plural, one {# stream} other {# streams}} enabled"
                  values={{
                    count: (
                      <EuiTextColor color="default">
                        <strong>
                          {packageConfigInput.streams.filter((stream) => stream.enabled).length}
                        </strong>
                      </EuiTextColor>
                    ),
                    total: packageInputStreams.length,
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
                        'xpack.ingestManager.createPackageConfig.stepConfigure.hideStreamsAriaLabel',
                        {
                          defaultMessage: 'Hide {type} streams',
                          values: {
                            type: packageInput.type,
                          },
                        }
                      )
                    : i18n.translate(
                        'xpack.ingestManager.createPackageConfig.stepConfigure.showStreamsAriaLabel',
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
          <PackageConfigInputConfig
            packageInputVars={packageInput.vars}
            packageConfigInput={packageConfigInput}
            updatePackageConfigInput={updatePackageConfigInput}
            inputVarsValidationResults={{ vars: inputValidationResults.vars }}
            forceShowErrors={forceShowErrors}
          />
          <EuiHorizontalRule margin="m" />
        </Fragment>
      ) : null}

      {/* Per-stream configuration */}
      {isShowingStreams ? (
        <EuiFlexGroup direction="column">
          {packageInputStreams.map((packageInputStream) => {
            const packageConfigInputStream = packageConfigInput.streams.find(
              (stream) => stream.dataset.name === packageInputStream.dataset.name
            );
            return packageConfigInputStream ? (
              <EuiFlexItem key={packageInputStream.dataset.name}>
                <PackageConfigInputStreamConfig
                  packageInputStream={packageInputStream}
                  packageConfigInputStream={packageConfigInputStream}
                  updatePackageConfigInputStream={(
                    updatedStream: Partial<PackageConfigInputStream>
                  ) => {
                    const indexOfUpdatedStream = packageConfigInput.streams.findIndex(
                      (stream) => stream.dataset.name === packageInputStream.dataset.name
                    );
                    const newStreams = [...packageConfigInput.streams];
                    newStreams[indexOfUpdatedStream] = {
                      ...newStreams[indexOfUpdatedStream],
                      ...updatedStream,
                    };

                    const updatedInput: Partial<PackageConfigInput> = {
                      streams: newStreams,
                    };

                    // Update input enabled state if needed
                    if (!packageConfigInput.enabled && updatedStream.enabled) {
                      updatedInput.enabled = true;
                    } else if (
                      packageConfigInput.enabled &&
                      !newStreams.find((stream) => stream.enabled)
                    ) {
                      updatedInput.enabled = false;
                    }

                    updatePackageConfigInput(updatedInput);
                  }}
                  inputStreamValidationResults={
                    inputValidationResults.streams![packageConfigInputStream.id]
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
