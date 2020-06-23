/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import {
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiSpacer,
} from '@elastic/eui';

import { FieldList } from '../../field_list';

const columns = [
  {
    field: 'name',
    name: i18n.translate('xpack.rollupJobs.jobDetails.tabHistogram.nameColumnLabel', {
      defaultMessage: 'Field',
    }),
    sortable: true,
  },
];

export const TabHistogram = ({ histogram, histogramInterval }) => (
  <Fragment>
    <EuiDescriptionList textStyle="reverse">
      <EuiDescriptionListTitle>
        <FormattedMessage
          id="xpack.rollupJobs.jobDetails.tabHistogram.intervalLabel"
          defaultMessage="Histogram interval"
        />
      </EuiDescriptionListTitle>

      <EuiDescriptionListDescription>{histogramInterval}</EuiDescriptionListDescription>
    </EuiDescriptionList>

    <EuiSpacer size="l" />

    <FieldList columns={columns} fields={histogram} dataTestSubj="detailPanelHistogramTabTable" />
  </Fragment>
);
