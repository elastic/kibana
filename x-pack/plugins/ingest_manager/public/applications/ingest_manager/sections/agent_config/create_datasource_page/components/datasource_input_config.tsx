/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiSpacer,
  EuiButtonEmpty,
  EuiTitle,
} from '@elastic/eui';
import { DatasourceInput, RegistryVarsEntry } from '../../../../types';
import { DatasourceInputVarField } from './datasource_input_var_field';

export const DatasourceInputConfig: React.FunctionComponent<{
  packageInputVars?: RegistryVarsEntry[];
  datasourceInput: DatasourceInput;
  updateDatasourceInput: (updatedInput: Partial<DatasourceInput>) => void;
}> = ({ packageInputVars, datasourceInput, updateDatasourceInput }) => {
  // Showing advanced options toggle state
  const [isShowingAdvanced, setIsShowingAdvanced] = useState<boolean>(false);

  const requiredVars: RegistryVarsEntry[] = [];
  const advancedVars: RegistryVarsEntry[] = [];

  if (packageInputVars) {
    packageInputVars.forEach(varDef => {
      if (varDef.required && !varDef.default) {
        requiredVars.push(varDef);
      } else {
        advancedVars.push(varDef);
      }
    });
  }

  return (
    <EuiFlexGrid columns={2}>
      <EuiFlexItem>
        <EuiTitle size="s">
          <h4>
            <FormattedMessage
              id="xpack.ingestManager.createDatasource.stepConfigure.inputSettingsTitle"
              defaultMessage="Settings"
            />
          </h4>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiText color="subdued" size="s">
          <p>
            <FormattedMessage
              id="xpack.ingestManager.createDatasource.stepConfigure.inputSettingsDescription"
              defaultMessage="The following settings will be applied to all streams below."
            />
          </p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup direction="column" gutterSize="m">
          {requiredVars.map(varDef => {
            const varName = varDef.name;
            const value = datasourceInput.streams[0].config![varName];
            return (
              <EuiFlexItem key={varName}>
                <DatasourceInputVarField
                  varDef={varDef}
                  value={value}
                  onChange={(newValue: any) => {
                    updateDatasourceInput({
                      streams: datasourceInput.streams.map(stream => ({
                        ...stream,
                        config: {
                          ...stream.config,
                          [varName]: newValue,
                        },
                      })),
                    });
                  }}
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
                    const varName = varDef.name;
                    const value = datasourceInput.streams[0].config![varName];
                    return (
                      <EuiFlexItem key={varName}>
                        <DatasourceInputVarField
                          varDef={varDef}
                          value={value}
                          onChange={(newValue: any) => {
                            updateDatasourceInput({
                              streams: datasourceInput.streams.map(stream => ({
                                ...stream,
                                config: {
                                  ...stream.config,
                                  [varName]: newValue,
                                },
                              })),
                            });
                          }}
                        />
                      </EuiFlexItem>
                    );
                  })
                : null}
            </Fragment>
          ) : null}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGrid>
  );
};
