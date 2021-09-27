/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle } from '@elastic/eui';
import styled from 'styled-components';
import { isEmpty } from 'lodash';
import { AllSeries } from '../../../..';
import { LayerConfig, LensAttributes } from '../configurations/lens_attributes';
import { getDefaultConfigs } from '../configurations/default_configs';
import { OperationTypeComponent } from '../series_builder/columns/operation_type_select';
import { UrlFilter } from '../types';
import { getFiltersFromDefs } from '../hooks/use_lens_attributes';
import { DataView } from '../../../../../../../../src/plugins/data/common';
import { LensPublicStart } from '../../../../../../lens/public';

export interface ExploratoryEmbeddableProps {
  attributes: AllSeries;
  appendTitle?: JSX.Element;
  title: string | JSX.Element;
  showCalculationMethod?: boolean;
}

export interface ExploratoryEmbeddableComponentProps extends ExploratoryEmbeddableProps {
  lens: LensPublicStart;
  indexPattern: DataView;
}

// eslint-disable-next-line import/no-default-export
export default function Embeddable({
  attributes,
  title,
  appendTitle,
  indexPattern,
  lens,
  showCalculationMethod = false,
}: ExploratoryEmbeddableComponentProps) {
  const LensComponent = lens?.EmbeddableComponent;

  const series = Object.entries(attributes)[0][1];
  const allSeriesIds = Object.keys(attributes);

  const [operationType, setOperationType] = useState(series?.operationType);

  const layerConfigs: LayerConfig[] = [];

  allSeriesIds.forEach((seriesIdT) => {
    const seriesT = attributes[seriesIdT];
    if (indexPattern && seriesT.reportType && !isEmpty(seriesT.reportDefinitions)) {
      const seriesConfig = getDefaultConfigs({
        reportType: seriesT.reportType,
        dataType: seriesT.dataType,
        indexPattern,
      });

      const filters: UrlFilter[] = (seriesT.filters ?? []).concat(
        getFiltersFromDefs(seriesT.reportDefinitions)
      );

      layerConfigs.push({
        filters,
        indexPattern,
        seriesConfig,
        time: seriesT.time,
        breakdown: seriesT.breakdown,
        seriesType: seriesT.seriesType,
        operationType: seriesT.operationType,
        reportDefinitions: seriesT.reportDefinitions ?? {},
        selectedMetricField: seriesT.selectedMetricField,
      });
    }
  });

  const lensAttributes = new LensAttributes(layerConfigs);

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
