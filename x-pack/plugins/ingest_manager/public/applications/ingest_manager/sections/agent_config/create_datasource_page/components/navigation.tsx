/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import styled from 'styled-components';
import { useHistory } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { EuiStepsHorizontal } from '@elastic/eui';
import { CreateDatasourceFrom, CreateDatasourceStep } from '../types';
import { WeightedCreateDatasourceSteps, CREATE_DATASOURCE_STEP_PATHS } from '../constants';

const StepsHorizontal = styled(EuiStepsHorizontal)`
  background: none;
`;

export const CreateDatasourceStepsNavigation: React.FunctionComponent<{
  from: CreateDatasourceFrom;
  basePath: string;
  maxStep: CreateDatasourceStep | '';
  currentStep: CreateDatasourceStep;
}> = ({ from, basePath, maxStep, currentStep }) => {
  const history = useHistory();

  const steps = [
    from === 'config'
      ? {
          title: i18n.translate('xpack.ingestManager.createDatasource.stepSelectPackageLabel', {
            defaultMessage: 'Select package',
          }),
          isSelected: currentStep === 'selectPackage',
          isComplete:
            WeightedCreateDatasourceSteps.indexOf('selectPackage') <=
            WeightedCreateDatasourceSteps.indexOf(maxStep),
          onClick: () => {
            history.push(`${basePath}${CREATE_DATASOURCE_STEP_PATHS.selectPackage}`);
          },
        }
      : {
          title: i18n.translate('xpack.ingestManager.createDatasource.stepSelectConfigLabel', {
            defaultMessage: 'Select configuration',
          }),
          isSelected: currentStep === 'selectConfig',
          isComplete:
            WeightedCreateDatasourceSteps.indexOf('selectConfig') <=
            WeightedCreateDatasourceSteps.indexOf(maxStep),
          onClick: () => {
            history.push(`${basePath}${CREATE_DATASOURCE_STEP_PATHS.selectConfig}`);
          },
        },
    {
      title: i18n.translate('xpack.ingestManager.createDatasource.stepConfigureDatasourceLabel', {
        defaultMessage: 'Configure data source',
      }),
      isSelected: currentStep === 'configure',
      isComplete:
        WeightedCreateDatasourceSteps.indexOf('configure') <=
        WeightedCreateDatasourceSteps.indexOf(maxStep),
      disabled:
        WeightedCreateDatasourceSteps.indexOf(maxStep) <
        WeightedCreateDatasourceSteps.indexOf('configure') - 1,
      onClick: () => {
        history.push(`${basePath}${CREATE_DATASOURCE_STEP_PATHS.configure}`);
      },
    },
    {
      title: i18n.translate('xpack.ingestManager.createDatasource.stepReviewLabel', {
        defaultMessage: 'Review',
      }),
      isSelected: currentStep === 'review',
      isComplete:
        WeightedCreateDatasourceSteps.indexOf('review') <=
        WeightedCreateDatasourceSteps.indexOf(maxStep),
      disabled:
        WeightedCreateDatasourceSteps.indexOf(maxStep) <
        WeightedCreateDatasourceSteps.indexOf('review') - 1,
      onClick: () => {
        history.push(`${basePath}${CREATE_DATASOURCE_STEP_PATHS.review}`);
      },
    },
  ];

  return <StepsHorizontal steps={steps} />;
};
