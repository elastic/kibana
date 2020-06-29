/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiPanel, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PackageInfo, RegistryStream, NewPackageConfig, PackageConfigInput } from '../../../types';
import { Loading } from '../../../components';
import { PackageConfigValidationResults, validationHasErrors } from './services';
import { PackageConfigInputPanel, CustomPackageConfig } from './components';
import { CreatePackageConfigFrom } from './types';

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

export const StepConfigurePackage: React.FunctionComponent<{
  from?: CreatePackageConfigFrom;
  packageInfo: PackageInfo;
  packageConfig: NewPackageConfig;
  packageConfigId?: string;
  updatePackageConfig: (fields: Partial<NewPackageConfig>) => void;
  validationResults: PackageConfigValidationResults;
  submitAttempted: boolean;
}> = ({
  from = 'config',
  packageInfo,
  packageConfig,
  packageConfigId,
  updatePackageConfig,
  validationResults,
  submitAttempted,
}) => {
  const hasErrors = validationResults ? validationHasErrors(validationResults) : false;

  // Configure inputs (and their streams)
  // Assume packages only export one config template for now
  const renderConfigureInputs = () =>
    packageInfo.config_templates &&
    packageInfo.config_templates[0] &&
    packageInfo.config_templates[0].inputs &&
    packageInfo.config_templates[0].inputs.length ? (
      <EuiFlexGroup direction="column">
        {packageInfo.config_templates[0].inputs.map((packageInput) => {
          const packageConfigInput = packageConfig.inputs.find(
            (input) => input.type === packageInput.type
          );
          const packageInputStreams = findStreamsForInputType(packageInput.type, packageInfo);
          return packageConfigInput ? (
            <EuiFlexItem key={packageInput.type}>
              <PackageConfigInputPanel
                packageInput={packageInput}
                packageInputStreams={packageInputStreams}
                packageConfigInput={packageConfigInput}
                updatePackageConfigInput={(updatedInput: Partial<PackageConfigInput>) => {
                  const indexOfUpdatedInput = packageConfig.inputs.findIndex(
                    (input) => input.type === packageInput.type
                  );
                  const newInputs = [...packageConfig.inputs];
                  newInputs[indexOfUpdatedInput] = {
                    ...newInputs[indexOfUpdatedInput],
                    ...updatedInput,
                  };
                  updatePackageConfig({
                    inputs: newInputs,
                  });
                }}
                inputValidationResults={validationResults!.inputs![packageConfigInput.type]}
                forceShowErrors={submitAttempted}
              />
            </EuiFlexItem>
          ) : null;
        })}
      </EuiFlexGroup>
    ) : (
      <EuiPanel>
        <CustomPackageConfig
          from={from}
          packageName={packageInfo.name}
          packageConfig={packageConfig}
          packageConfigId={packageConfigId}
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
              'xpack.ingestManager.createPackageConfig.stepConfigure.validationErrorTitle',
              {
                defaultMessage: 'Your integration configuration has errors',
              }
            )}
            color="danger"
          >
            <p>
              <FormattedMessage
                id="xpack.ingestManager.createPackageConfig.stepConfigure.validationErrorText"
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
