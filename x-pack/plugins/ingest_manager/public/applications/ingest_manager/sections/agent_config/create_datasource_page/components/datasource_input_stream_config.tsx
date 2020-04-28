/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, Fragment } from 'react';
import ReactMarkdown from 'react-markdown';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  EuiText,
  EuiSpacer,
  EuiButtonEmpty,
  EuiTextColor,
  EuiIconTip,
} from '@elastic/eui';
import { DatasourceInputStream, RegistryStream, RegistryVarsEntry } from '../../../../types';
import { isAdvancedVar, DatasourceConfigValidationResults, validationHasErrors } from '../services';
import { DatasourceInputVarField } from './datasource_input_var_field';

export const DatasourceInputStreamConfig: React.FunctionComponent<{
  packageInputStream: RegistryStream;
  datasourceInputStream: DatasourceInputStream;
  updateDatasourceInputStream: (updatedStream: Partial<DatasourceInputStream>) => void;
  inputStreamValidationResults: DatasourceConfigValidationResults;
  forceShowErrors?: boolean;
}> = ({
  packageInputStream,
  datasourceInputStream,
  updateDatasourceInputStream,
  inputStreamValidationResults,
  forceShowErrors,
}) => {
  // Showing advanced options toggle state
  const [isShowingAdvanced, setIsShowingAdvanced] = useState<boolean>(false);

  // Errors state
  const hasErrors = forceShowErrors && validationHasErrors(inputStreamValidationResults);

  const requiredVars: RegistryVarsEntry[] = [];
  const advancedVars: RegistryVarsEntry[] = [];

  if (packageInputStream.vars && packageInputStream.vars.length) {
    packageInputStream.vars.forEach(varDef => {
      if (isAdvancedVar(varDef)) {
        advancedVars.push(varDef);
      } else {
        requiredVars.push(varDef);
      }
    });
  }

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={1}>
        <EuiSwitch
          label={
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiTextColor color={hasErrors ? 'danger' : 'default'}>
                  {packageInputStream.title || packageInputStream.dataset}
                </EuiTextColor>
              </EuiFlexItem>
              {hasErrors ? (
                <EuiFlexItem grow={false}>
                  <EuiIconTip
                    content={
                      <FormattedMessage
                        id="xpack.ingestManager.createDatasource.stepConfigure.streamLevelErrorsTooltip"
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
          checked={datasourceInputStream.enabled}
          onChange={e => {
            const enabled = e.target.checked;
            updateDatasourceInputStream({
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
      <EuiFlexItem grow={1}>
        <EuiFlexGroup direction="column" gutterSize="m">
          {requiredVars.map(varDef => {
            const { name: varName, type: varType } = varDef;
            const value = datasourceInputStream.vars![varName].value;
            return (
              <EuiFlexItem key={varName}>
                <DatasourceInputVarField
                  varDef={varDef}
                  value={value}
                  onChange={(newValue: any) => {
                    updateDatasourceInputStream({
                      vars: {
                        ...datasourceInputStream.vars,
                        [varName]: {
                          type: varType,
                          value: newValue,
                        },
                      },
                    });
                  }}
                  errors={inputStreamValidationResults.vars![varName]}
                  forceShowErrors={forceShowErrors}
                />
              </EuiFlexItem>
            );
          })}
          {advancedVars.length ? (
            <Fragment>
              <EuiFlexItem>
                {/* Wrapper div to prevent button from going full width */}
                <div>
                  <EuiButtonEmpty
                    size="xs"
                    iconType={isShowingAdvanced ? 'arrowDown' : 'arrowRight'}
                    onClick={() => setIsShowingAdvanced(!isShowingAdvanced)}
                    flush="left"
                  >
                    <FormattedMessage
                      id="xpack.ingestManager.createDatasource.stepConfigure.toggleAdvancedOptionsButtonText"
                      defaultMessage="Advanced options"
                    />
                  </EuiButtonEmpty>
                </div>
              </EuiFlexItem>
              {isShowingAdvanced
                ? advancedVars.map(varDef => {
                    const { name: varName, type: varType } = varDef;
                    const value = datasourceInputStream.vars![varName].value;
                    return (
                      <EuiFlexItem key={varName}>
                        <DatasourceInputVarField
                          varDef={varDef}
                          value={value}
                          onChange={(newValue: any) => {
                            updateDatasourceInputStream({
                              vars: {
                                ...datasourceInputStream.vars,
                                [varName]: {
                                  type: varType,
                                  value: newValue,
                                },
                              },
                            });
                          }}
                          errors={inputStreamValidationResults.vars![varName]}
                          forceShowErrors={forceShowErrors}
                        />
                      </EuiFlexItem>
                    );
                  })
                : null}
            </Fragment>
          ) : null}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
