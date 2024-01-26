/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, Fragment, memo, useMemo, useEffect, useRef } from 'react';
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

import { useQuery } from '@tanstack/react-query';

import { DATASET_VAR_NAME } from '../../../../../../../../../common/constants';

import { useConfig, sendGetDataStreams } from '../../../../../../../../hooks';

import {
  getRegistryDataStreamAssetBaseName,
  mapPackageReleaseToIntegrationCardRelease,
} from '../../../../../../../../../common/services';

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

import { useIndexTemplateExists } from '../../datastream_hooks';

import { PackagePolicyInputVarField } from './package_policy_input_var_field';
import { useDataStreamId } from './hooks';
import { sortDatastreamsByDataset } from './sort_datastreams';

const ScrollAnchor = styled.div`
  display: none;
  scroll-margin-top: var(--euiFixedHeadersOffset, 0);
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

    const customDatasetVar = packagePolicyInputStream.vars?.[DATASET_VAR_NAME];
    const customDatasetVarValue = customDatasetVar?.value?.dataset || customDatasetVar?.value;

    const { exists: indexTemplateExists, isLoading: isLoadingIndexTemplate } =
      useIndexTemplateExists(
        getRegistryDataStreamAssetBaseName({
          dataset: customDatasetVarValue || packageInputStream.data_stream.dataset,
          type: packageInputStream.data_stream.type,
        }),
        isPackagePolicyEdit
      );

    // only show pipelines and mappings if the matching index template exists
    // in the legacy case (e.g logs package pre 2.0.0) the index template will not exist
    // because we allowed dataset to be customized but didnt create a matching index template
    // for the new dataset.
    const showPipelinesAndMappings = !isLoadingIndexTemplate && indexTemplateExists;

    useEffect(() => {
      if (isDefaultDatastream && containerRef.current) {
        containerRef.current.scrollIntoView();
      }
    }, [isDefaultDatastream, containerRef]);

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

    const { data: dataStreamsData } = useQuery(['datastreams'], () => sendGetDataStreams(), {
      enabled: packageInfo.type === 'input', // Only fetch datastream for input type package
    });
    const datasetList = uniq(dataStreamsData?.data_streams) ?? [];
    const datastreams = sortDatastreamsByDataset(datasetList, packageInfo.name);

    // Showing advanced options toggle state
    const [isShowingAdvanced, setIsShowingAdvanced] = useState<boolean>(isDefaultDatastream);
    const hasAdvancedOptions = useMemo(() => {
      return (
        advancedVars.length > 0 ||
        (isPackagePolicyEdit && showPipelinesAndMappings) ||
        isExperimentalDataStreamSettingsEnabled
      );
    }, [
      advancedVars.length,
      isExperimentalDataStreamSettingsEnabled,
      isPackagePolicyEdit,
      showPipelinesAndMappings,
    ]);

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
                      packageName={packageInfo.name}
                      datastreams={datastreams}
                      isEditPage={isEditPage}
                    />
                  </EuiFlexItem>
                );
              })}

              {/* Advanced section */}
              {hasAdvancedOptions && (
                <Fragment>
                  <EuiFlexItem>
                    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                      <EuiFlexItem grow={false}>
                        <EuiButtonEmpty
                          size="xs"
                          iconType={isShowingAdvanced ? 'arrowDown' : 'arrowRight'}
                          onClick={() => setIsShowingAdvanced(!isShowingAdvanced)}
                          flush="left"
                          data-test-subj={`advancedStreamOptionsToggle-${packagePolicyInputStream.id}`}
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
                              packageName={packageInfo.name}
                              datastreams={datastreams}
                              isEditPage={isEditPage}
                            />
                          </EuiFlexItem>
                        );
                      })}
                      {isPackagePolicyEdit && showPipelinesAndMappings && (
                        <>
                          <EuiFlexItem>
                            <PackagePolicyEditorDatastreamPipelines
                              packageInputStream={packagePolicyInputStream}
                              packageInfo={packageInfo}
                              customDataset={customDatasetVarValue}
                            />
                          </EuiFlexItem>
                          <EuiFlexItem>
                            <PackagePolicyEditorDatastreamMappings
                              packageInputStream={packagePolicyInputStream}
                              packageInfo={packageInfo}
                              customDataset={customDatasetVarValue}
                            />
                          </EuiFlexItem>
                        </>
                      )}
                    </>
                  ) : null}
                </Fragment>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGrid>
      </>
    );
  }
);
