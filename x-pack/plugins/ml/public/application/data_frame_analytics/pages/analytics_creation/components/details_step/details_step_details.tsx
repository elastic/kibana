/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiDescriptionList, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { State } from '../../../analytics_management/hooks/use_create_analytics_form/state';

export interface ListItems {
  title: string;
  description: string | JSX.Element;
}

export const DetailsStepDetails: FC<{ state: State }> = ({ state }) => {
  const { form } = state;
  const { description, jobId, destinationIndex } = form;

  const detailsFirstCol: ListItems[] = [
    {
      title: i18n.translate('xpack.ml.dataframe.analytics.create.configDetails.jobId', {
        defaultMessage: 'Job id',
      }),
      description: jobId,
    },
  ];

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
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <EuiDescriptionList compressed listItems={detailsFirstCol} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiDescriptionList compressed listItems={detailsSecondCol} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiDescriptionList compressed listItems={detailsThirdCol} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
