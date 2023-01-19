/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, Fragment, memo, useMemo, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  EuiText,
  EuiSpacer,
  EuiButtonEmpty,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { useRouteMatch } from 'react-router-dom';

import { mapPackageReleaseToIntegrationCardRelease } from '../../../../../../../../../common/services';

import { getRegistryDataStreamAssetBaseName } from '../../../../../../../../../common/services';
import type { ExperimentalIndexingFeature } from '../../../../../../../../../common/types/models/epm';
import type {
  NewPackagePolicy,
  NewPackagePolicyInputStream,
  PackageInfo,
  RegistryStream,
  RegistryVarsEntry,
} from '../../../../../../types';
import { InlineReleaseBadge } from '../../../../../../components';
import type { PackagePolicyConfigValidationResults } from '../../../services';
import { isAdvancedVar, validationHasErrors } from '../../../services';
import { PackagePolicyEditorDatastreamPipelines } from '../../datastream_pipelines';
import { PackagePolicyEditorDatastreamMappings } from '../../datastream_mappings';

import { PackagePolicyInputVarField } from './package_policy_input_var_field';
import { useDataStreamId } from './hooks';

const FlexItemWithMaxWidth = styled(EuiFlexItem)`
  max-width: calc(50% - ${(props) => props.theme.eui.euiSizeL});
`;

const ScrollAnchor = styled.div`
  scroll-margin-top: ${(props) => parseFloat(props.theme.eui.euiHeaderHeightCompensation) * 2}px;
`;

interface Props {
  packagePolicy: NewPackagePolicy;
  packageInputStream: RegistryStream & { data_stream: { dataset: string; type: string } };
  packageInfo: PackageInfo;
  packagePolicyInputStream: NewPackagePolicyInputStream;
  updatePackagePolicy: (updatedPackagePolicy: Partial<NewPackagePolicy>) => void;
  updatePackagePolicyInputStream: (updatedStream: Partial<NewPackagePolicyInputStream>) => void;
  inputStreamValidationResults: PackagePolicyConfigValidationResults;
  forceShowErrors?: boolean;
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
  }) => {
    const {
      params: { packagePolicyId },
    } = useRouteMatch<{ packagePolicyId?: string }>();
    const defaultDataStreamId = useDataStreamId();
    const containerRef = useRef<HTMLDivElement>(null);

    const isDefaultDatstream =
      !!defaultDataStreamId &&
      !!packagePolicyInputStream.id &&
      packagePolicyInputStream.id === defaultDataStreamId;
    const isPackagePolicyEdit = !!packagePolicyId;

    useEffect(() => {
      if (isDefaultDatstream && containerRef.current) {
        containerRef.current.scrollIntoView();
      }
    }, [isDefaultDatstream, containerRef]);

    // Showing advanced options toggle state
    const [isShowingAdvanced, setIsShowingAdvanced] = useState<boolean>(isDefaultDatstream);

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

    const isFeatureEnabled = useCallback(
      (feature: ExperimentalIndexingFeature) =>
        packagePolicy.package?.experimental_data_stream_features?.some(
          ({ data_stream: dataStream, features }) =>
            dataStream ===
              getRegistryDataStreamAssetBaseName(packagePolicyInputStream.data_stream) &&
            features[feature]
        ) ?? false,
      [
        packagePolicy.package?.experimental_data_stream_features,
        packagePolicyInputStream.data_stream,
      ]
    );

    const newExperimentalIndexingFeature = {
      synthetic_source: isFeatureEnabled('synthetic_source'),
      tsdb: isFeatureEnabled('tsdb'),
    };

    const onIndexingSettingChange = (
      features: Partial<Record<ExperimentalIndexingFeature, boolean>>
    ) => {
      if (!packagePolicy.package) {
        return;
      }

      const newExperimentalDataStreamFeatures = [
        ...(packagePolicy.package.experimental_data_stream_features ?? []),
      ];

      const dataStream = getRegistryDataStreamAssetBaseName(packagePolicyInputStream.data_stream);

      const existingSettingRecord = newExperimentalDataStreamFeatures.find(
        (x) => x.data_stream === dataStream
      );

      if (existingSettingRecord) {
        existingSettingRecord.features = {
          ...existingSettingRecord.features,
          ...features,
        };
      } else {
        newExperimentalDataStreamFeatures.push({
          data_stream: dataStream,
          features: { ...newExperimentalIndexingFeature, ...features },
        });
      }

      updatePackagePolicy({
        package: {
          ...packagePolicy.package,
          experimental_data_stream_features: newExperimentalDataStreamFeatures,
        },
      });
    };

    return (
      <>
        <EuiFlexGrid columns={2} id={isDefaultDatstream ? 'test123' : 'asas'}>
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
                  {packagePolicyInputStream.release && packagePolicyInputStream.release !== 'ga' ? (
                    <EuiFlexItem grow={false}>
                      <InlineReleaseBadge
                        release={mapPackageReleaseToIntegrationCardRelease(
                          packagePolicyInputStream.release
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
          <FlexItemWithMaxWidth>
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
                          />
                        </EuiFlexItem>
                      );
                    })}
                    {/* Only show datastream pipelines and mappings on edit */}
                    {isPackagePolicyEdit && (
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
                    <EuiFlexItem>
                      <EuiFlexGroup direction="column" gutterSize="xs">
                        <EuiFlexItem grow={false}>
                          <EuiTitle size="xxxs">
                            <h5>
                              <FormattedMessage
                                id="xpack.fleet.packagePolicyEditor.experimentalSettings.title"
                                defaultMessage="Indexing settings (experimental)"
                              />
                            </h5>
                          </EuiTitle>
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <EuiText color="subdued" size="xs">
                            <FormattedMessage
                              id="xpack.fleet.createPackagePolicy.stepConfigure.experimentalFeaturesDescription"
                              defaultMessage="Select data streams to configure indexing options. This is an {experimentalFeature} and may have effects on other properties."
                              values={{
                                experimentalFeature: (
                                  <strong>
                                    <FormattedMessage
                                      id="xpack.fleet.createPackagePolicy.experimentalFeatureText"
                                      defaultMessage="experimental feature"
                                    />
                                  </strong>
                                ),
                              }}
                            />
                          </EuiText>
                        </EuiFlexItem>
                        <EuiSpacer size="s" />
                        <EuiFlexItem>
                          <EuiSwitch
                            checked={isFeatureEnabled('synthetic_source')}
                            label={
                              <FormattedMessage
                                id="xpack.fleet.createPackagePolicy.experimentalFeatures.syntheticSourceLabel"
                                defaultMessage="Synthetic source"
                              />
                            }
                            onChange={(e) => {
                              onIndexingSettingChange({
                                synthetic_source: e.target.checked,
                              });
                            }}
                          />
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <EuiToolTip
                            content={
                              <FormattedMessage
                                id="xpack.fleet.createPackagePolicy.experimentalFeatures.TSDBTooltip"
                                defaultMessage="Enabling this feature is irreversible"
                              />
                            }
                          >
                            <EuiSwitch
                              disabled={isFeatureEnabled('tsdb')}
                              checked={isFeatureEnabled('tsdb')}
                              label={
                                <FormattedMessage
                                  id="xpack.fleet.createPackagePolicy.experimentalFeatures.TSDBLabel"
                                  defaultMessage="Time-series indexing (TSDB)"
                                />
                              }
                              onChange={(e) => {
                                onIndexingSettingChange({
                                  tsdb: e.target.checked,
                                });
                              }}
                            />
                          </EuiToolTip>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                  </>
                ) : null}
              </Fragment>
            </EuiFlexGroup>
          </FlexItemWithMaxWidth>
        </EuiFlexGrid>
      </>
    );
  }
);
