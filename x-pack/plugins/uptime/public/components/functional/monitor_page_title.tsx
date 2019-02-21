/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer, EuiTextColor, EuiTitle } from '@elastic/eui';
import React, { Fragment } from 'react';
import { MonitorPageTitle as TitleType } from 'x-pack/plugins/uptime/common/graphql/types';

interface MonitorPageTitleProps {
  pageTitle: TitleType;
}

export const MonitorPageTitle = ({ pageTitle: { name, url, id } }: MonitorPageTitleProps) => (
  <Fragment>
    <EuiTitle>
      <h2>{name ? name : url}</h2>
    </EuiTitle>
    <EuiSpacer size="xxs" />
    <EuiTitle size="xxs">
      <EuiTextColor color="subdued">
        <h4>{id}</h4>
      </EuiTextColor>
    </EuiTitle>
  </Fragment>
);
