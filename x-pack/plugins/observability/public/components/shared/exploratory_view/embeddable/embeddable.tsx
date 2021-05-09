/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiText, EuiTitle } from '@elastic/eui';
import styled from 'styled-components';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { IndexPattern } from '../../../../../../../../src/plugins/data/public';
import { AllSeries, ObservabilityPublicPluginsStart } from '../../../..';
import { LensAttributes } from '../configurations/lens_attributes';
import { getDefaultConfigs } from '../configurations/default_configs';

import { ObservabilityIndexPatterns } from '../utils/observability_index_patterns';
import { OperationTypeComponent } from '../series_builder/columns/operation_type_select';

export interface ExploratoryEmbeddableProps {
  attributes: AllSeries;
  appendTitle: JSX.Element;
  title: string | JSX.Element;
  showCalculationMethod?: boolean;
}

// eslint-disable-next-line import/no-default-export
export default function Embeddable({
  attributes,
  title,
  appendTitle,
  showCalculationMethod = true,
}: ExploratoryEmbeddableProps) {
  const {
    services: { lens, data },
  } = useKibana<ObservabilityPublicPluginsStart>();

  const [loading, setLoading] = useState(false);
  const [indexPattern, setIndexPattern] = useState<IndexPattern>();

  const LensComponent = lens?.EmbeddableComponent;

  const series = Object.entries(attributes)[0][1];
  const seriesId = Object.entries(attributes)[0][0];

  const [operationType, setOperationType] = useState(series?.operationType);

  const { seriesType, dataType, reportType, reportDefinitions, filters } = series;

  const loadIndexPattern = useCallback(
    async ({ dataType: dt }) => {
      setLoading(true);
      try {
        const obsvIndexP = new ObservabilityIndexPatterns(data);
        const indPattern = await obsvIndexP.getIndexPattern(dt, 'heartbeat-*');
        setIndexPattern(indPattern!);

        setLoading(false);
      } catch (e) {
        setLoading(false);
      }
    },
    [data]
  );

  useEffect(() => {
    loadIndexPattern({ dataType });
  }, [dataType, loadIndexPattern]);

  if (!indexPattern || loading) {
    return <EuiLoadingSpinner />;
  }

  const dataViewConfig = getDefaultConfigs({
    seriesId,
    reportType,
    indexPattern,
  });

  const lensAttributes = new LensAttributes(
    indexPattern,
    dataViewConfig,
    seriesType,
    filters,
    operationType,
    reportDefinitions
  );

  if (series.breakdown) {
    lensAttributes.addBreakdown(series.breakdown);
  }

  if (!LensComponent) {
    return <EuiText>No lens component</EuiText>;
  }

  return (
    <Wrapper>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h3>{title}</h3>
          </EuiTitle>
        </EuiFlexItem>
        {showCalculationMethod && (
          <EuiFlexItem grow={false} style={{ minWidth: 150 }}>
            <OperationTypeComponent
              operationType={operationType}
              onChange={(val) => {
                setOperationType(val);
              }}
            />
          </EuiFlexItem>
        )}
        {appendTitle}
      </EuiFlexGroup>
      <LensComponent
        id="exploratoryView"
        style={{ height: '100%' }}
        timeRange={series?.time}
        attributes={lensAttributes.getJSON()}
        onBrushEnd={({ range }) => {}}
      />
    </Wrapper>
  );
}

const Wrapper = styled.div`
  height: 100%;
  &&& {
    > :nth-child(2) {
      height: calc(100% - 56px);
    }
  }
`;
