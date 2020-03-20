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
import { isAdvancedVar } from '../services';
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
      if (isAdvancedVar(varDef)) {
        advancedVars.push(varDef);
      } else {
        requiredVars.push(varDef);
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
              defaultMessage="The following settings are applicable to all streams."
            />
          </p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup direction="column" gutterSize="m">
          {requiredVars.map(varDef => {
            const { name: varName, type: varType } = varDef;
            const value = datasourceInput.config![varName].value;
            return (
              <EuiFlexItem key={varName}>
                <DatasourceInputVarField
                  varDef={varDef}
                  value={value}
                  onChange={(newValue: any) => {
                    updateDatasourceInput({
                      config: {
                        ...datasourceInput.config,
                        [varName]: {
                          type: varType,
                          value: newValue,
                        },
                      },
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
                    const { name: varName, type: varType } = varDef;
                    const value = datasourceInput.config![varName].value;
                    return (
                      <EuiFlexItem key={varName}>
                        <DatasourceInputVarField
                          varDef={varDef}
                          value={value}
                          onChange={(newValue: any) => {
                            updateDatasourceInput({
                              config: {
                                ...datasourceInput.config,
                                [varName]: {
                                  type: varType,
                                  value: newValue,
                                },
                              },
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
