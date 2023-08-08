/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DataComparisonSpec } from '@kbn/data-visualizer-plugin/public';
import { useMlKibana } from '../../contexts/kibana';
import { useDataSource } from '../../contexts/ml';
import { MlPageHeader } from '../../components/page_header';
import { TechnicalPreviewBadge } from '../../components/technical_preview_badge';

export const DataComparisonPage: FC = () => {
  const {
    services: { dataVisualizer },
  } = useMlKibana();

  const [DataComparisonView, setDataComparisonView] = useState<DataComparisonSpec | null>(null);

  useEffect(() => {
    if (dataVisualizer !== undefined) {
      const { getDataComparisonComponent } = dataVisualizer;
      getDataComparisonComponent().then(setDataComparisonView);
    }
  }, [dataVisualizer]);

  const { selectedDataView: dataView, selectedSavedSearch: savedSearch } = useDataSource();

  return (
    <>
      <MlPageHeader>
        <EuiFlexGroup responsive={false} wrap={false} alignItems={'center'} gutterSize={'m'}>
          <EuiFlexItem grow={false}>
            <FormattedMessage
              id="xpack.ml.dataComparisonWithDocCount.pageHeader"
              defaultMessage="Data comparison"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <TechnicalPreviewBadge />
          </EuiFlexItem>
        </EuiFlexGroup>
      </MlPageHeader>
      {dataView && DataComparisonView ? (
        <DataComparisonView dataView={dataView} savedSearch={savedSearch} />
      ) : null}
    </>
  );
};
