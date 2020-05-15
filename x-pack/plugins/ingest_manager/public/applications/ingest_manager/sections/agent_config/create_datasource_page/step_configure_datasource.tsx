/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiEmptyPrompt,
  EuiText,
  EuiCallOut,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PackageInfo, NewDatasource, DatasourceInput } from '../../../types';
import { Loading } from '../../../components';
import { DatasourceValidationResults, validationHasErrors } from './services';
import { DatasourceInputPanel } from './components';

export const StepConfigureDatasource: React.FunctionComponent<{
  packageInfo: PackageInfo;
  datasource: NewDatasource;
  updateDatasource: (fields: Partial<NewDatasource>) => void;
  validationResults: DatasourceValidationResults;
  submitAttempted: boolean;
}> = ({ packageInfo, datasource, updateDatasource, validationResults, submitAttempted }) => {
  const hasErrors = validationResults ? validationHasErrors(validationResults) : false;

  // Configure inputs (and their streams)
  // Assume packages only export one datasource for now
  const renderConfigureInputs = () =>
    packageInfo.datasources &&
    packageInfo.datasources[0] &&
    packageInfo.datasources[0].inputs &&
    packageInfo.datasources[0].inputs.length ? (
      <EuiFlexGroup direction="column">
        {packageInfo.datasources[0].inputs.map(packageInput => {
          const datasourceInput = datasource.inputs.find(input => input.type === packageInput.type);
          return datasourceInput ? (
            <EuiFlexItem key={packageInput.type}>
              <DatasourceInputPanel
                packageInput={packageInput}
                datasourceInput={datasourceInput}
                updateDatasourceInput={(updatedInput: Partial<DatasourceInput>) => {
                  const indexOfUpdatedInput = datasource.inputs.findIndex(
                    input => input.type === packageInput.type
                  );
                  const newInputs = [...datasource.inputs];
                  newInputs[indexOfUpdatedInput] = {
                    ...newInputs[indexOfUpdatedInput],
                    ...updatedInput,
                  };
                  updateDatasource({
                    inputs: newInputs,
                  });
                }}
                inputValidationResults={validationResults!.inputs![datasourceInput.type]}
                forceShowErrors={submitAttempted}
              />
            </EuiFlexItem>
          ) : null;
        })}
      </EuiFlexGroup>
    ) : (
      <EuiPanel>
        <EuiEmptyPrompt
          iconType="checkInCircleFilled"
          iconColor="secondary"
          body={
            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.ingestManager.createDatasource.stepConfigure.noConfigOptionsMessage"
                  defaultMessage="Nothing to configure"
                />
              </p>
            </EuiText>
          }
        />
      </EuiPanel>
    );

  return validationResults ? (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem>{renderConfigureInputs()}</EuiFlexItem>
      {hasErrors && submitAttempted ? (
        <EuiFlexItem>
          <EuiSpacer size="m" />
          <EuiCallOut
            title={i18n.translate(
              'xpack.ingestManager.createDatasource.stepConfigure.validationErrorTitle',
              {
                defaultMessage: 'Your data source configuration has errors',
              }
            )}
            color="danger"
          >
            <p>
              <FormattedMessage
                id="xpack.ingestManager.createDatasource.stepConfigure.validationErrorText"
                defaultMessage="Please fix the above errors before continuing"
              />
            </p>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  ) : (
    <Loading />
  );
};
