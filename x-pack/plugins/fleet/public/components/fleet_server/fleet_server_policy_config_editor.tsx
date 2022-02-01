/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, Fragment, useMemo } from 'react';
import styled from 'styled-components';
import satisfies from 'semver/functions/satisfies';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  EuiText,
  EuiButtonIcon,
  EuiHorizontalRule,
  EuiSpacer,
} from '@elastic/eui';

import type { PackagePolicyEditExtensionComponentProps } from '../../../public';

import type {
  NewPackagePolicyInput,
  PackagePolicyInputStream,
  RegistryInput,
  RegistryStream,
} from '../../types';
import { countValidationErrors, getStreamsForInputType } from '../../services';
import { PackagePolicyInputConfig } from '../../applications/fleet/sections/agent_policy/create_package_policy_page/components/package_policy_input_config';
import { hasInvalidButRequiredVar } from '../../applications/fleet/sections/agent_policy/create_package_policy_page/services';
import { PackagePolicyInputStreamConfig } from '../../applications/fleet/sections/agent_policy/create_package_policy_page/components/package_policy_input_stream';

const ShortenedHorizontalRule = styled(EuiHorizontalRule)`
  &&& {
    width: ${(11 / 12) * 100}%;
    margin-left: auto;
  }
`;

type ConfigMutation = (value: any) => MutationResult;
interface FieldMutationMap {
  [field: string]: ConfigMutation;
}

function deepAssign(target: Record<string, any>, ...sources: Array<Record<string, any>>) {
  for (const source of sources) {
    deepAssignSingle(target, source);
  }
}

function deepAssignSingle(target: Record<string, any>, source: Record<string, any>) {
  for (const key of Object.keys(source)) {
    const value = source[key];
    if (typeof value === 'object' && typeof target[key] === 'object') {
      deepAssignSingle(target[key], value);
    } else {
      target[key] = value;
    }
  }
}

class ConfigMutator {
  readonly fieldMutators: FieldMutationMap;
  constructor(mutators: FieldMutationMap) {
    this.fieldMutators = mutators;
  }

  public mutate(field: string, value: any): ReturnType<ConfigMutation> {
    if (!this.fieldMutators[field]) {
      return {};
    }

    return this.fieldMutators[field](value);
  }

  public applyMutations(
    newConfig: Record<string, any>,
    oldConfig: Record<string, any>,
    currentPath: string[] = []
  ): ReturnType<ConfigMutation> {
    const mutationValues = Object.create(null);
    for (const key of Object.keys(newConfig)) {
      const value = newConfig[key];
      currentPath.push(key);
      if (typeof value === 'object' && value.value == null && value.type == null) {
        const subMutation = this.applyMutations(value, oldConfig[key], currentPath);
        if (Object.keys(subMutation).length > 0) {
          mutationValues[key] = subMutation;
        }
      } else if (
        this.fieldMutators[currentPath.join('.')] &&
        value.value !== oldConfig[key].value
      ) {
        Object.assign(mutationValues, this.mutate(currentPath.join('.'), value));
      }
      currentPath.pop();
    }
    return mutationValues;
  }
}

interface MutatorMap {
  [range: string]: ConfigMutator;
}

interface MutationResult {
  [key: string]: any;
}

const versionToMutator: MutatorMap = {
  '>=1.1.1': new ConfigMutator({
    'vars.max_connections': function toMaxAgents({ value }: { value: string }): MutationResult {
      return { max_agents: { value: Math.ceil(parseInt(value, 10) / 2), type: 'integer' } };
    },
    'vars.max_agents': function toMaxConnections({ value }: { value: string }): MutationResult {
      return { max_connections: { value: 2 * parseInt(value, 10), type: 'integer' } };
    },
  }),
};

const identityMutator = new ConfigMutator({});

const shouldShowStreamsByDefault = (
  packageInput: RegistryInput,
  packageInputStreams: Array<RegistryStream & { data_stream: { dataset: string } }>,
  packagePolicyInput: NewPackagePolicyInput
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

export const FleetServerPackagePolicyConfigExtension =
  React.memo<PackagePolicyEditExtensionComponentProps>(
    ({ onChange, validationResults, packageInfo, newPolicy }) => {
      const packagePolicyInput = newPolicy.inputs[0];
      const packagePolicy = newPolicy.package;
      const forceShowErrors = false;
      const configMutator = useMemo(
        () =>
          Object.keys(versionToMutator).reduce(
            (mu: ConfigMutator | null, versionRange: string) =>
              mu
                ? mu
                : satisfies(packageInfo!.version, versionRange)
                ? versionToMutator[versionRange]
                : null,
            null
          ) ?? identityMutator,
        [packageInfo]
      );

      const policyTemplate = useMemo(() => packageInfo!.policy_templates![0], [packageInfo]);

      const packageInput = useMemo(() => policyTemplate.inputs![0], [policyTemplate]);
      const packageInputStreams = useMemo(
        () =>
          packageInfo == null
            ? []
            : getStreamsForInputType(
                'fleet-server',
                packageInfo,
                policyTemplate?.data_streams ?? []
              ),
        [packageInfo, policyTemplate?.data_streams]
      );
      const hasInputStreams = useMemo(
        () => packageInputStreams.length > 0,
        [packageInputStreams.length]
      );

      const [isShowingStreams, setIsShowingStreams] = useState<boolean>(
        shouldShowStreamsByDefault(packageInput, packageInputStreams, packagePolicyInput)
      );

      const inputStreams = useMemo(
        () =>
          packageInputStreams
            .map((packageInputStream) => {
              return {
                packageInputStream,
                packagePolicyInputStream: packagePolicyInput.streams.find(
                  (stream) => stream.data_stream.dataset === packageInputStream.data_stream.dataset
                ),
              };
            })
            .filter((stream) => Boolean(stream.packagePolicyInputStream)),
        [packageInputStreams, packagePolicyInput.streams]
      );

      const inputValidationResults = useMemo(
        () => validationResults!.inputs!['fleet-server'] ?? {},
        [validationResults]
      );
      const errorCount = countValidationErrors(inputValidationResults);
      const hasErrors = errorCount > 0;
      return !packagePolicyInput ? null : (
        <>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiSwitch
                label={
                  <EuiFlexGroup alignItems="center" gutterSize="s">
                    <EuiFlexItem grow={false}>
                      <EuiText>
                        <h4>{packagePolicy?.title || packagePolicyInput.type}</h4>
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                }
                checked={packagePolicyInput.enabled}
                disabled={packagePolicyInput.keep_enabled}
                onChange={(e) => {
                  const enabled = e.target.checked;
                  onChange({
                    isValid: true,
                    updatedPolicy: {
                      ...newPolicy,
                      inputs: [
                        {
                          ...packagePolicyInput,
                          enabled,
                          streams: packagePolicyInput.streams.map((stream) => ({
                            ...stream,
                            enabled,
                          })),
                        },
                      ],
                    },
                  });
                }}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" alignItems="center">
                {hasErrors ? (
                  <EuiFlexItem grow={false}>
                    <EuiText color="danger" size="s">
                      <FormattedMessage
                        id="xpack.fleet.createPackagePolicy.stepConfigure.errorCountText"
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
                            'xpack.fleet.createPackagePolicy.stepConfigure.hideStreamsAriaLabel',
                            {
                              defaultMessage: 'Hide {type} inputs',
                              values: {
                                type: packagePolicyInput.type,
                              },
                            }
                          )
                        : i18n.translate(
                            'xpack.fleet.createPackagePolicy.stepConfigure.showStreamsAriaLabel',
                            {
                              defaultMessage: 'Show {type} inputs',
                              values: {
                                type: packagePolicyInput.type,
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
          {isShowingStreams && packageInput.vars && packageInput.vars?.length ? (
            <Fragment>
              <PackagePolicyInputConfig
                hasInputStreams={hasInputStreams}
                packageInputVars={packageInput!.vars}
                packagePolicyInput={packagePolicyInput}
                updatePackagePolicyInput={(updatedInput: Partial<NewPackagePolicyInput>) => {
                  const mutationValues = configMutator.applyMutations(
                    updatedInput,
                    packagePolicyInput
                  );
                  const inputResult = { ...packagePolicyInput };
                  deepAssign(inputResult, updatedInput, mutationValues);
                  onChange({
                    isValid: true,
                    updatedPolicy: {
                      ...newPolicy,
                      inputs: [inputResult],
                    },
                  });
                }}
                inputVarsValidationResults={{ vars: inputValidationResults.vars }}
                forceShowErrors={forceShowErrors}
              />
              {hasInputStreams ? <ShortenedHorizontalRule margin="m" /> : <EuiSpacer size="l" />}
            </Fragment>
          ) : null}

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

                      const updatedInput: Partial<NewPackagePolicyInput> = {
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

                      onChange({
                        isValid: true,
                        updatedPolicy: {
                          ...newPolicy,
                          inputs: [
                            {
                              ...packagePolicyInput,
                              ...updatedInput,
                            },
                          ],
                        },
                      });
                    }}
                    inputStreamValidationResults={
                      inputValidationResults.streams![
                        packagePolicyInputStream!.data_stream!.dataset
                      ]
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
FleetServerPackagePolicyConfigExtension.displayName = 'FleetServerPackagePolicyConfigExtension';
