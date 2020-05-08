/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { useAlertingSelector } from '../../hooks/use_alerting_selector';
import * as selectors from '../../../store/selectors';
import {
  GeneralAccordion,
  HostAccordion,
  HashAccordion,
  FileAccordion,
  SourceProcessAccordion,
  SourceProcessTokenAccordion,
} from '../metadata';

export const MetadataPanel = memo(() => {
  const alertDetailsData = useAlertingSelector(selectors.selectedAlertDetailsData);
  if (alertDetailsData === undefined) {
    return null;
  }
  return (
    <section className="overview-metadata-panel">
      <GeneralAccordion alertData={alertDetailsData} />
      <EuiSpacer />
      <HostAccordion alertData={alertDetailsData} />
      <EuiSpacer />
      <HashAccordion alertData={alertDetailsData} />
      <EuiSpacer />
      <FileAccordion alertData={alertDetailsData} />
      <EuiSpacer />
      <SourceProcessAccordion alertData={alertDetailsData} />
      <EuiSpacer />
      <SourceProcessTokenAccordion alertData={alertDetailsData} />
    </section>
  );
});
