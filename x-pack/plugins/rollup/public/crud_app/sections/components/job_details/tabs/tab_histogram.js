/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

import {
  EuiTitle,
  EuiSpacer,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

export const TabHistogramUi = ({ histogram, histogramInterval }) => {
  // TODO: Render a table if there are more than 20 fields.

  const renderedTerms = histogram.map(({ name }) => {
    return (
      <li key={name}>
        {name}
      </li>
    );
  });

  return (
    <Fragment>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.rollupJobs.jobDetails.tabHistogram.sectionHistogram.title"
                defaultMessage="Histogram"
              />
            </h3>
          </EuiTitle>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.rollupJobs.jobDetails.tabHistogram.interval.label"
                defaultMessage="Interval: {histogramInterval}"
                values={{ histogramInterval }}
              />
            </p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <EuiText>
        <ul>
          {renderedTerms}
        </ul>
      </EuiText>
    </Fragment>
  );
};

export const TabHistogram = injectI18n(TabHistogramUi);
