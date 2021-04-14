/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';

import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export const DeprecationCountSummary: FunctionComponent<{
  allDeprecationsCount: number;
  filteredDeprecationsCount: number;
}> = ({ filteredDeprecationsCount, allDeprecationsCount }) => (
  <EuiText size="s">
    {allDeprecationsCount > 0 ? (
      <FormattedMessage
        id="xpack.upgradeAssistant.checkupTab.numDeprecationsShownLabel"
        defaultMessage="Showing {numShown} of {total}"
        values={{ numShown: filteredDeprecationsCount, total: allDeprecationsCount }}
      />
    ) : (
      <FormattedMessage
        id="xpack.upgradeAssistant.checkupTab.noDeprecationsLabel"
        defaultMessage="No deprecations"
      />
    )}
    {filteredDeprecationsCount !== allDeprecationsCount && (
      <>
        {'. '}
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.changeFiltersShowMoreLabel"
          description="Explains how to show all deprecations if there are more available."
          defaultMessage="Change filter to show more."
        />
      </>
    )}
  </EuiText>
);
