/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, Fragment, memo } from 'react';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  EuiText,
  EuiButtonIcon,
  EuiHorizontalRule,
  EuiSpacer,
} from '@elastic/eui';
import {
  PackageConfigInput,
  PackageConfigInputStream,
  RegistryInput,
  RegistryStream,
} from '../../../../types';
import {
  PackageConfigInputValidationResults,
  hasInvalidButRequiredVar,
  countValidationErrors,
} from '../services';
import { PackageConfigInputConfig } from './package_config_input_config';
import { PackageConfigInputStreamConfig } from './package_config_input_stream';

const ShortenedHorizontalRule = styled(EuiHorizontalRule)`
  &&& {
    width: ${(11 / 12) * 100}%;
    margin-left: auto;
  }
`;

const shouldShowStreamsByDefault = (
  packageInput: RegistryInput,
  packageInputStreams: Array<RegistryStream & { dataset: { name: string } }>,
  packageConfigInput: PackageConfigInput
): boolean => {
  return (
    packageConfigInput.enabled &&
    (hasInvalidButRequiredVar(packageInput.vars, packageConfigInput.vars) ||
      Boolean(
        packageInputStreams.find(
          (stream) =>
            stream.enabled &&
            hasInvalidButRequiredVar(
              stream.vars,
              packageConfigInput.streams.find(
                (pkgStream) => stream.dataset.name === pkgStream.dataset.name
              )?.vars
            )
        )
      ))
  );
};

export const PackageConfigInputPanel: React.FunctionComponent<{
  packageInput: RegistryInput;
  packageInputStreams: Array<RegistryStream & { dataset: { name: string } }>;
  packageConfigInput: PackageConfigInput;
  updatePackageConfigInput: (updatedInput: Partial<PackageConfigInput>) => void;
  inputValidationResults: PackageConfigInputValidationResults;
  forceShowErrors?: boolean;
}> = memo(
  ({
    packageInput,
    packageInputStreams,
    packageConfigInput,
    updatePackageConfigInput,
    inputValidationResults,
    forceShowErrors,
  }) => {
    // Showing streams toggle state
    const [isShowingStreams, setIsShowingStreams] = useState<boolean>(
      shouldShowStreamsByDefault(packageInput, packageInputStreams, packageConfigInput)
    );

    // Errors state
    const errorCount = countValidationErrors(inputValidationResults);
    const hasErrors = forceShowErrors && errorCount;

    const inputStreams = packageInputStreams
      .map((packageInputStream) => {
        return {
          packageInputStream,
          packageConfigInputStream: packageConfigInput.streams.find(
            (stream) => stream.dataset.name === packageInputStream.dataset.name
          ),
        };
      })
      .filter((stream) => Boolean(stream.packageConfigInputStream));

    return (
      <>
        {/* Header / input-level toggle */}
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiSwitch
              label={
                <EuiFlexGroup alignItems="center" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiText>
                      <h4>{packageInput.title || packageInput.type}</h4>
                    </EuiText>
                  </EuiFlexItem>
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
                if (!enabled && isShowingStreams) {
                  setIsShowingStreams(false);
                }
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" alignItems="center">
              {hasErrors ? (
                <EuiFlexItem grow={false}>
                  <EuiText color="danger" size="s">
                    <FormattedMessage
                      id="xpack.ingestManager.createPackageConfig.stepConfigure.errorCountText"
                      defaultMessage="{count, plural, one {# error} other {# errors}}"
                      values={{ count: errorCount }}
                    />
                  </EuiText>
                </EuiFlexItem>
              ) : null}
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType={isShowingStreams ? 'arrowUp' : 'arrowDown'}
                  onClick={() => setIsShowingStreams(!isShowingStreams)}
                  color={hasErrors ? 'danger' : 'text'}
                  aria-label={
                    isShowingStreams
                      ? i18n.translate(
                          'xpack.ingestManager.createPackageConfig.stepConfigure.hideStreamsAriaLabel',
                          {
                            defaultMessage: 'Hide {type} inputs',
                            values: {
                              type: packageInput.type,
                            },
                          }
                        )
                      : i18n.translate(
                          'xpack.ingestManager.createPackageConfig.stepConfigure.showStreamsAriaLabel',
                          {
                            defaultMessage: 'Show {type} inputs',
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
        {isShowingStreams ? <EuiSpacer size="l" /> : null}

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
            <ShortenedHorizontalRule margin="m" />
          </Fragment>
        ) : null}

        {/* Per-stream configuration */}
        {isShowingStreams ? (
          <EuiFlexGroup direction="column">
            {inputStreams.map(({ packageInputStream, packageConfigInputStream }, index) => (
              <EuiFlexItem key={index}>
                <PackageConfigInputStreamConfig
                  packageInputStream={packageInputStream}
                  packageConfigInputStream={packageConfigInputStream!}
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
                    inputValidationResults.streams![packageConfigInputStream!.id]
                  }
                  forceShowErrors={forceShowErrors}
                />
                {index !== inputStreams.length - 1 ? (
                  <>
                    <EuiSpacer size="m" />
                    <ShortenedHorizontalRule margin="none" />
                  </>
                ) : null}
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        ) : null}
      </>
    );
  }
);
