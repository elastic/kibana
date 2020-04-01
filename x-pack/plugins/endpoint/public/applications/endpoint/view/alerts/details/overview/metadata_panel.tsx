/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { useAlertListSelector } from '../../hooks/use_alerts_selector';
import * as selectors from '../../../../store/alerts/selectors';
import {
  GeneralAccordion,
  HostAccordion,
  HashAccordion,
  FileAccordion,
  SourceProcessAccordion,
  SourceProcessTokenAccordion,
} from '../metadata';

export const MetadataPanel = memo(() => {
  const alertDetailsData = useAlertListSelector(selectors.selectedAlertDetailsData);
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
