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
  PackagePolicyInput,
  PackagePolicyInputStream,
  RegistryInput,
  RegistryStream,
} from '../../../../types';
import {
  PackagePolicyInputValidationResults,
  hasInvalidButRequiredVar,
  countValidationErrors,
} from '../services';
import { PackagePolicyInputConfig } from './package_policy_input_config';
import { PackagePolicyInputStreamConfig } from './package_policy_input_stream';

const ShortenedHorizontalRule = styled(EuiHorizontalRule)`
  &&& {
    width: ${(11 / 12) * 100}%;
    margin-left: auto;
  }
`;

const shouldShowStreamsByDefault = (
  packageInput: RegistryInput,
  packageInputStreams: Array<RegistryStream & { data_stream: { dataset: string } }>,
  packagePolicyInput: PackagePolicyInput
): boolean => {
  return (
    packagePolicyInput.enabled &&
    (hasInvalidButRequiredVar(packageInput.vars, packagePolicyInput.vars) ||
      Boolean(
        packageInputStreams.find(
          (stream) =>
            stream.enabled &&
            hasInvalidButRequiredVar(
              stream.vars,
              packagePolicyInput.streams.find(
                (pkgStream) => stream.data_stream.dataset === pkgStream.data_stream.dataset
              )?.vars
            )
        )
      ))
  );
};

export const PackagePolicyInputPanel: React.FunctionComponent<{
  packageInput: RegistryInput;
  packageInputStreams: Array<RegistryStream & { data_stream: { dataset: string } }>;
  packagePolicyInput: PackagePolicyInput;
  updatePackagePolicyInput: (updatedInput: Partial<PackagePolicyInput>) => void;
  inputValidationResults: PackagePolicyInputValidationResults;
  forceShowErrors?: boolean;
}> = memo(
  ({
    packageInput,
    packageInputStreams,
    packagePolicyInput,
    updatePackagePolicyInput,
    inputValidationResults,
    forceShowErrors,
  }) => {
    // Showing streams toggle state
    const [isShowingStreams, setIsShowingStreams] = useState<boolean>(
      shouldShowStreamsByDefault(packageInput, packageInputStreams, packagePolicyInput)
    );

    // Errors state
    const errorCount = countValidationErrors(inputValidationResults);
    const hasErrors = forceShowErrors && errorCount;

    const inputStreams = packageInputStreams
      .map((packageInputStream) => {
        return {
          packageInputStream,
          packagePolicyInputStream: packagePolicyInput.streams.find(
            (stream) => stream.data_stream.dataset === packageInputStream.data_stream.dataset
          ),
        };
      })
      .filter((stream) => Boolean(stream.packagePolicyInputStream));

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
              checked={packagePolicyInput.enabled}
              onChange={(e) => {
                const enabled = e.target.checked;
                updatePackagePolicyInput({
                  enabled,
                  streams: packagePolicyInput.streams.map((stream) => ({
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
                      id="xpack.ingestManager.createPackagePolicy.stepConfigure.errorCountText"
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
                          'xpack.ingestManager.createPackagePolicy.stepConfigure.hideStreamsAriaLabel',
                          {
                            defaultMessage: 'Hide {type} inputs',
                            values: {
                              type: packageInput.type,
                            },
                          }
                        )
                      : i18n.translate(
                          'xpack.ingestManager.createPackagePolicy.stepConfigure.showStreamsAriaLabel',
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

        {/* Input level policy */}
        {isShowingStreams && packageInput.vars && packageInput.vars.length ? (
          <Fragment>
            <PackagePolicyInputConfig
              packageInputVars={packageInput.vars}
              packagePolicyInput={packagePolicyInput}
              updatePackagePolicyInput={updatePackagePolicyInput}
              inputVarsValidationResults={{ vars: inputValidationResults.vars }}
              forceShowErrors={forceShowErrors}
            />
            <ShortenedHorizontalRule margin="m" />
          </Fragment>
        ) : null}

        {/* Per-stream policy */}
        {isShowingStreams ? (
          <EuiFlexGroup direction="column">
            {inputStreams.map(({ packageInputStream, packagePolicyInputStream }, index) => (
              <EuiFlexItem key={index}>
                <PackagePolicyInputStreamConfig
                  packageInputStream={packageInputStream}
                  packagePolicyInputStream={packagePolicyInputStream!}
                  updatePackagePolicyInputStream={(
                    updatedStream: Partial<PackagePolicyInputStream>
                  ) => {
                    const indexOfUpdatedStream = packagePolicyInput.streams.findIndex(
                      (stream) =>
                        stream.data_stream.dataset === packageInputStream.data_stream.dataset
                    );
                    const newStreams = [...packagePolicyInput.streams];
                    newStreams[indexOfUpdatedStream] = {
                      ...newStreams[indexOfUpdatedStream],
                      ...updatedStream,
                    };

                    const updatedInput: Partial<PackagePolicyInput> = {
                      streams: newStreams,
                    };

                    // Update input enabled state if needed
                    if (!packagePolicyInput.enabled && updatedStream.enabled) {
                      updatedInput.enabled = true;
                    } else if (
                      packagePolicyInput.enabled &&
                      !newStreams.find((stream) => stream.enabled)
                    ) {
                      updatedInput.enabled = false;
                    }

                    updatePackagePolicyInput(updatedInput);
                  }}
                  inputStreamValidationResults={
                    inputValidationResults.streams![packagePolicyInputStream!.id]
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
