/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, Fragment, memo, useMemo, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import styled from 'styled-components';
import { uniq } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  EuiText,
  EuiSpacer,
  EuiButtonEmpty,
} from '@elastic/eui';
import { useRouteMatch } from 'react-router-dom';

import { useConfig, useGetDataStreams } from '../../../../../../../../hooks';

import { mapPackageReleaseToIntegrationCardRelease } from '../../../../../../../../services/package_prerelease';
import type { ExperimentalDataStreamFeature } from '../../../../../../../../../common/types/models/epm';

import type {
  NewPackagePolicy,
  NewPackagePolicyInputStream,
  PackageInfo,
  RegistryStreamWithDataStream,
  RegistryVarsEntry,
} from '../../../../../../types';
import { InlineReleaseBadge } from '../../../../../../components';
import type { PackagePolicyConfigValidationResults } from '../../../services';
import { isAdvancedVar, validationHasErrors } from '../../../services';
import { PackagePolicyEditorDatastreamPipelines } from '../../datastream_pipelines';
import { PackagePolicyEditorDatastreamMappings } from '../../datastream_mappings';

import { ExperimentDatastreamSettings } from './experimental_datastream_settings';
import { PackagePolicyInputVarField } from './package_policy_input_var_field';
import { useDataStreamId } from './hooks';
import { orderDatasets } from './order_datasets';

const ScrollAnchor = styled.div`
  display: none;
  scroll-margin-top: ${(props) => parseFloat(props.theme.eui.euiHeaderHeightCompensation) * 2}px;
`;

interface Props {
  packagePolicy: NewPackagePolicy;
  packageInputStream: RegistryStreamWithDataStream;
  packageInfo: PackageInfo;
  packagePolicyInputStream: NewPackagePolicyInputStream;
  updatePackagePolicy: (updatedPackagePolicy: Partial<NewPackagePolicy>) => void;
  updatePackagePolicyInputStream: (updatedStream: Partial<NewPackagePolicyInputStream>) => void;
  inputStreamValidationResults: PackagePolicyConfigValidationResults;
  forceShowErrors?: boolean;
  isEditPage?: boolean;
}

export const PackagePolicyInputStreamConfig = memo<Props>(
  ({
    packagePolicy,
    packageInputStream,
    packageInfo,
    packagePolicyInputStream,
    updatePackagePolicy,
    updatePackagePolicyInputStream,
    inputStreamValidationResults,
    forceShowErrors,
    isEditPage,
  }) => {
    const config = useConfig();
    const isExperimentalDataStreamSettingsEnabled =
      config.enableExperimental?.includes('experimentalDataStreamSettings') ?? false;

    const {
      params: { packagePolicyId },
    } = useRouteMatch<{ packagePolicyId?: string }>();
    const defaultDataStreamId = useDataStreamId();
    const containerRef = useRef<HTMLDivElement>(null);

    const isDefaultDatastream =
      !!defaultDataStreamId &&
      !!packagePolicyInputStream.id &&
      packagePolicyInputStream.id === defaultDataStreamId;
    const isPackagePolicyEdit = !!packagePolicyId;
    const isInputOnlyPackage = packageInfo.type === 'input';

    useEffect(() => {
      if (isDefaultDatastream && containerRef.current) {
        containerRef.current.scrollIntoView();
      }
    }, [isDefaultDatastream, containerRef]);

    // Showing advanced options toggle state
    const [isShowingAdvanced, setIsShowingAdvanced] = useState<boolean>(isDefaultDatastream);

    // Errors state
    const hasErrors = forceShowErrors && validationHasErrors(inputStreamValidationResults);

    const [requiredVars, advancedVars] = useMemo(() => {
      const _requiredVars: RegistryVarsEntry[] = [];
      const _advancedVars: RegistryVarsEntry[] = [];

      if (packageInputStream.vars && packageInputStream.vars.length) {
        packageInputStream.vars.forEach((varDef) => {
          if (isAdvancedVar(varDef)) {
            _advancedVars.push(varDef);
          } else {
            _requiredVars.push(varDef);
          }
        });
      }

      return [_requiredVars, _advancedVars];
    }, [packageInputStream.vars]);

    const advancedVarsWithErrorsCount: number = useMemo(
      () =>
        advancedVars.filter(
          ({ name: varName }) => inputStreamValidationResults?.vars?.[varName]?.length
        ).length,
      [advancedVars, inputStreamValidationResults?.vars]
    );

    const setNewExperimentalDataFeatures = useCallback(
      (newFeatures: ExperimentalDataStreamFeature[]) => {
        if (!packagePolicy.package) {
          return;
        }

        updatePackagePolicy({
          package: {
            ...packagePolicy.package,
            experimental_data_stream_features: newFeatures,
          },
        });
      },
      [updatePackagePolicy, packagePolicy]
    );

    const { data: dataStreamsData } = useGetDataStreams();
    const datasetList =
      uniq(dataStreamsData?.data_streams.map((dataStream) => dataStream.dataset)) ?? [];
    const datasets = orderDatasets(datasetList, packageInfo.name);

    return (
      <>
        <EuiFlexGrid columns={2}>
          <ScrollAnchor ref={containerRef} />
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="none" alignItems="flexStart">
              <EuiFlexItem grow={1} />
              <EuiFlexItem grow={5}>
                <EuiFlexGroup
                  gutterSize="none"
                  alignItems="flexStart"
                  justifyContent="spaceBetween"
                >
                  {packageInfo.type !== 'input' && (
                    <EuiFlexItem grow={false}>
                      <EuiSwitch
                        label={packageInputStream.title}
                        disabled={packagePolicyInputStream.keep_enabled}
                        checked={packagePolicyInputStream.enabled}
                        onChange={(e) => {
                          const enabled = e.target.checked;
                          updatePackagePolicyInputStream({
                            enabled,
                          });
                        }}
                      />
                    </EuiFlexItem>
                  )}
                  {packageInputStream.data_stream.release &&
                  packageInputStream.data_stream.release !== 'ga' ? (
                    <EuiFlexItem grow={false}>
                      <InlineReleaseBadge
                        release={mapPackageReleaseToIntegrationCardRelease(
                          packageInputStream.data_stream.release
                        )}
                      />
                    </EuiFlexItem>
                  ) : null}
                </EuiFlexGroup>
                {packageInfo.type !== 'input' && packageInputStream.description ? (
                  <Fragment>
                    <EuiSpacer size="s" />
                    <EuiText size="s" color="subdued">
                      <ReactMarkdown>{packageInputStream.description}</ReactMarkdown>
                    </EuiText>
                  </Fragment>
                ) : null}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="m">
              {requiredVars.map((varDef) => {
                if (!packagePolicyInputStream?.vars) return null;
                const { name: varName, type: varType } = varDef;
                const varConfigEntry = packagePolicyInputStream.vars?.[varName];
                const value = varConfigEntry?.value;
                const frozen = varConfigEntry?.frozen ?? false;

                return (
                  <EuiFlexItem key={varName}>
                    <PackagePolicyInputVarField
                      varDef={varDef}
                      value={value}
                      frozen={frozen}
                      onChange={(newValue: any) => {
                        updatePackagePolicyInputStream({
                          vars: {
                            ...packagePolicyInputStream.vars,
                            [varName]: {
                              type: varType,
                              value: newValue,
                            },
                          },
                        });
                      }}
                      errors={inputStreamValidationResults?.vars![varName]}
                      forceShowErrors={forceShowErrors}
                      packageType={packageInfo.type}
                      datasets={datasets}
                      isEditPage={isEditPage}
                    />
                  </EuiFlexItem>
                );
              })}
              {/* Advanced section - always shown since we display experimental indexing settings here */}
              <Fragment>
                <EuiFlexItem>
                  <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty
                        size="xs"
                        iconType={isShowingAdvanced ? 'arrowDown' : 'arrowRight'}
                        onClick={() => setIsShowingAdvanced(!isShowingAdvanced)}
                        flush="left"
                      >
                        <FormattedMessage
                          id="xpack.fleet.createPackagePolicy.stepConfigure.toggleAdvancedOptionsButtonText"
                          defaultMessage="Advanced options"
                        />
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                    {!isShowingAdvanced && hasErrors && advancedVarsWithErrorsCount ? (
                      <EuiFlexItem grow={false}>
                        <EuiText color="danger" size="s">
                          <FormattedMessage
                            id="xpack.fleet.createPackagePolicy.stepConfigure.errorCountText"
                            defaultMessage="{count, plural, one {# error} other {# errors}}"
                            values={{ count: advancedVarsWithErrorsCount }}
                          />
                        </EuiText>
                      </EuiFlexItem>
                    ) : null}
                  </EuiFlexGroup>
                </EuiFlexItem>
                {isShowingAdvanced ? (
                  <>
                    {advancedVars.map((varDef) => {
                      if (!packagePolicyInputStream.vars) return null;
                      const { name: varName, type: varType } = varDef;
                      const value = packagePolicyInputStream.vars?.[varName]?.value;

                      return (
                        <EuiFlexItem key={varName}>
                          <PackagePolicyInputVarField
                            varDef={varDef}
                            value={value}
                            onChange={(newValue: any) => {
                              updatePackagePolicyInputStream({
                                vars: {
                                  ...packagePolicyInputStream.vars,
                                  [varName]: {
                                    type: varType,
                                    value: newValue,
                                  },
                                },
                              });
                            }}
                            errors={inputStreamValidationResults?.vars![varName]}
                            forceShowErrors={forceShowErrors}
                            packageType={packageInfo.type}
                            datasets={datasets}
                            isEditPage={isEditPage}
                          />
                        </EuiFlexItem>
                      );
                    })}
                    {/* Only show datastream pipelines and mappings on edit and not for input packages*/}
                    {isPackagePolicyEdit && !isInputOnlyPackage && (
                      <>
                        <EuiFlexItem>
                          <PackagePolicyEditorDatastreamPipelines
                            packageInputStream={packagePolicyInputStream}
                            packageInfo={packageInfo}
                          />
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <PackagePolicyEditorDatastreamMappings
                            packageInputStream={packagePolicyInputStream}
                            packageInfo={packageInfo}
                          />
                        </EuiFlexItem>
                      </>
                    )}
                    {/* Experimental index/datastream settings e.g. synthetic source */}
                    {isExperimentalDataStreamSettingsEnabled && (
                      <ExperimentDatastreamSettings
                        registryDataStream={packageInputStream.data_stream}
                        experimentalDataFeatures={
                          packagePolicy.package?.experimental_data_stream_features
                        }
                        setNewExperimentalDataFeatures={setNewExperimentalDataFeatures}
                      />
                    )}
                  </>
                ) : null}
              </Fragment>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGrid>
      </>
    );
  }
);
