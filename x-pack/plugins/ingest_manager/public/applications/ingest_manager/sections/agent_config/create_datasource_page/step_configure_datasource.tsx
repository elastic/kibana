/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiPanel, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PackageInfo, RegistryStream, NewDatasource, DatasourceInput } from '../../../types';
import { Loading } from '../../../components';
import { DatasourceValidationResults, validationHasErrors } from './services';
import { DatasourceInputPanel, CustomConfigureDatasource } from './components';
import { CreateDatasourceFrom } from './types';

const findStreamsForInputType = (
  inputType: string,
  packageInfo: PackageInfo
): Array<RegistryStream & { dataset: { name: string } }> => {
  const streams: Array<RegistryStream & { dataset: { name: string } }> = [];

  (packageInfo.datasets || []).forEach((dataset) => {
    (dataset.streams || []).forEach((stream) => {
      if (stream.input === inputType) {
        streams.push({
          ...stream,
          dataset: {
            name: dataset.name,
          },
        });
      }
    });
  });

  return streams;
};

export const StepConfigureDatasource: React.FunctionComponent<{
  from?: CreateDatasourceFrom;
  packageInfo: PackageInfo;
  datasource: NewDatasource;
  datasourceId?: string;
  updateDatasource: (fields: Partial<NewDatasource>) => void;
  validationResults: DatasourceValidationResults;
  submitAttempted: boolean;
}> = ({
  from = 'config',
  packageInfo,
  datasource,
  datasourceId,
  updateDatasource,
  validationResults,
  submitAttempted,
}) => {
  const hasErrors = validationResults ? validationHasErrors(validationResults) : false;

  // Configure inputs (and their streams)
  // Assume packages only export one datasource for now
  const renderConfigureInputs = () =>
    packageInfo.config_templates &&
    packageInfo.config_templates[0] &&
    packageInfo.config_templates[0].inputs &&
    packageInfo.config_templates[0].inputs.length ? (
      <EuiFlexGroup direction="column">
        {packageInfo.config_templates[0].inputs.map((packageInput) => {
          const datasourceInput = datasource.inputs.find(
            (input) => input.type === packageInput.type
          );
          const packageInputStreams = findStreamsForInputType(packageInput.type, packageInfo);
          return datasourceInput ? (
            <EuiFlexItem key={packageInput.type}>
              <DatasourceInputPanel
                packageInput={packageInput}
                packageInputStreams={packageInputStreams}
                datasourceInput={datasourceInput}
                updateDatasourceInput={(updatedInput: Partial<DatasourceInput>) => {
                  const indexOfUpdatedInput = datasource.inputs.findIndex(
                    (input) => input.type === packageInput.type
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
        <CustomConfigureDatasource
          from={from}
          packageName={packageInfo.name}
          datasource={datasource}
          datasourceId={datasourceId}
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
