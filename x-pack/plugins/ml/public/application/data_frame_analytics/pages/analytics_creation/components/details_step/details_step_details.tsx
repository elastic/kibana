/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import { State } from '../../../analytics_management/hooks/use_create_analytics_form/state';
import { ANALYTICS_STEPS } from '../../page';

export interface ListItems {
  title: string;
  description: string | JSX.Element;
}

export const DetailsStepDetails: FC<{ setCurrentStep: any; state: State }> = ({
  setCurrentStep,
  state,
}) => {
  const { form, isJobCreated } = state;
  const { description, jobId, destinationIndex, resultsField } = form;

  const detailsFirstCol: ListItems[] = [
    {
      title: i18n.translate('xpack.ml.dataframe.analytics.create.configDetails.jobId', {
        defaultMessage: 'Job ID',
      }),
      description: jobId,
    },
  ];

  if (
    resultsField !== undefined &&
    typeof resultsField === 'string' &&
    resultsField.trim() !== ''
  ) {
    detailsFirstCol.push({
      title: i18n.translate('xpack.ml.dataframe.analytics.create.configDetails.resultsField', {
        defaultMessage: 'Results field',
      }),
      description: resultsField,
    });
  }

  const detailsSecondCol: ListItems[] = [
    {
      title: i18n.translate('xpack.ml.dataframe.analytics.create.configDetails.jobDescription', {
        defaultMessage: 'Job description',
      }),
      description,
    },
  ];

  const detailsThirdCol: ListItems[] = [
    {
      title: i18n.translate('xpack.ml.dataframe.analytics.create.configDetails.destIndex', {
        defaultMessage: 'Destination index',
      }),
      description: destinationIndex || '',
    },
  ];

  return (
    <Fragment>
      <EuiFlexGroup style={{ width: '70%' }} justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiDescriptionList compressed listItems={detailsFirstCol} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiDescriptionList
            style={{ wordBreak: 'break-word' }}
            compressed
            listItems={detailsSecondCol}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiDescriptionList compressed listItems={detailsThirdCol} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      {!isJobCreated && (
        <EuiButtonEmpty
          iconType="pencil"
          size="s"
          onClick={() => {
            setCurrentStep(ANALYTICS_STEPS.DETAILS);
          }}
        >
          {i18n.translate('xpack.ml.dataframe.analytics.create.detailsDetails.editButtonText', {
            defaultMessage: 'Edit',
          })}
        </EuiButtonEmpty>
      )}
    </Fragment>
  );
};
