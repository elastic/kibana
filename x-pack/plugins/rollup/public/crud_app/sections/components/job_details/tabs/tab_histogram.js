/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

import {
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiSpacer,
} from '@elastic/eui';

import { FieldList } from '../../field_list';

const columns = [{
  field: 'name',
  name: 'Field',
  truncateText: true,
  sortable: true,
}];

export const TabHistogramUi = ({ histogram, histogramInterval }) => (
  <Fragment>
    <EuiDescriptionList textStyle="reverse">
      <EuiDescriptionListTitle>
        <FormattedMessage
          id="xpack.rollupJobs.jobDetails.tabHistogram.interval.label"
          defaultMessage="Histogram interval"
        />
      </EuiDescriptionListTitle>

      <EuiDescriptionListDescription>
        {histogramInterval}
      </EuiDescriptionListDescription>
    </EuiDescriptionList>

    <EuiSpacer size="l" />

    <FieldList
      columns={columns}
      fields={histogram}
    />
  </Fragment>
);

export const TabHistogram = injectI18n(TabHistogramUi);
