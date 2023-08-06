/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiPageBody, EuiPageSection } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { parse } from 'query-string';
import { MlPageHeader } from '../../components/page_header';
import { DataDriftIndexPatternsEditor } from './data_drift_index_patterns_editor';

export const DataDriftIndexPatternsPicker: FC = () => {
  const { sourceIp, destIp } = parse(location.search, {
    sort: false,
  }) as { sourceIp: string; destIp: string };

  const initialProductionIndexPattern = destIp ? destIp.replaceAll(`'`, '') : '';
  const initialReferenceIndexPattern = sourceIp ? sourceIp.replaceAll(`'`, '') : '';

  return (
    <div data-test-subj="mlPageSourceSelection">
      <EuiPageBody restrictWidth={1200}>
        <MlPageHeader>
          <FormattedMessage
            id="xpack.ml.newJob.wizard.selectIndexPatterns"
            defaultMessage="Specify index patterns"
          />
        </MlPageHeader>
        <EuiPageSection>
          <DataDriftIndexPatternsEditor
            initialProductionIndexPattern={initialProductionIndexPattern}
            initialReferenceIndexPattern={initialReferenceIndexPattern}
          />
        </EuiPageSection>
      </EuiPageBody>
    </div>
  );
};
