/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiSpacer } from '@elastic/eui';
import React, { Fragment } from 'react';
import { PackageInfo } from '../../../../types';
import { Readme } from './readme';
import { Screenshots } from './screenshots';

export function OverviewPanel(props: PackageInfo) {
  const { screenshots, readme, name, version } = props;
  return (
    <Fragment>
      {readme && <Readme readmePath={readme} packageName={name} version={version} />}
      <EuiSpacer size="xl" />
      {screenshots && <Screenshots images={screenshots} />}
    </Fragment>
  );
}
