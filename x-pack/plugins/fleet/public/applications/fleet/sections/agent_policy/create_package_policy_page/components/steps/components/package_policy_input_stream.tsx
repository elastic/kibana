/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, Fragment, memo, useMemo, useEffect, useRef } from 'react';
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
} from '@elastic/eui';
import { useRouteMatch } from 'react-router-dom';

import type {
  NewPackagePolicy,
  NewPackagePolicyInputStream,
  PackageInfo,
  RegistryStream,
  RegistryVarsEntry,
} from '../../../../../../types';
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

export const PackagePolicyInputStreamConfig: React.FunctionComponent<{
  packagePolicy: NewPackagePolicy;
  packageInputStream: RegistryStream & { data_stream: { dataset: string; type: string } };
  packageInfo: PackageInfo;
  packagePolicyInputStream: NewPackagePolicyInputStream;
  updatePackagePolicyInputStream: (updatedStream: Partial<NewPackagePolicyInputStream>) => void;
  inputStreamValidationResults: PackagePolicyConfigValidationResults;
  forceShowErrors?: boolean;
}> = memo(
  ({
    packagePolicy,
    packageInputStream,
    packageInfo,
    packagePolicyInputStream,
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

    return (
      <EuiFlexGrid columns={2} id={isDefaultDatstream ? 'test123' : 'asas'}>
        <ScrollAnchor ref={containerRef} />
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="none" alignItems="flexStart">
            <EuiFlexItem grow={1} />
            <EuiFlexItem grow={5}>
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
              {packageInputStream.description ? (
                <Fragment>
                  <EuiSpacer size="s" />
                  <EuiText size="s" color="subdued">
                    <ReactMarkdown source={packageInputStream.description} />
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
            {/* Advanced section */}
            {(isPackagePolicyEdit || advancedVars.length) && (
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
                  </>
                ) : null}
              </Fragment>
            )}
          </EuiFlexGroup>
        </FlexItemWithMaxWidth>
      </EuiFlexGrid>
    );
  }
);
