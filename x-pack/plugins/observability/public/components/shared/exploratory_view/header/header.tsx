/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { TypedLensByValueInput } from '../../../../../../lens/public';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { ObservabilityClientPluginsStart } from '../../../../plugin';
import { ChartTemplates } from '../chart_templates/chart_templates';
import { ChartTypes } from './chart_types';
import { ReportViewType } from '../types';
import { DataViewLabels } from '../configurations/constants';
import { useUrlStorage } from '../hooks/use_url_strorage';
import { MetricSelection } from './metric_selection';

interface Props {
  seriesId: string;
  lensAttributes: TypedLensByValueInput['attributes'] | null;
}

export function ExploratoryViewHeader({ seriesId, lensAttributes }: Props) {
  const {
    services: { lens },
  } = useKibana<ObservabilityClientPluginsStart>();

  const { dataViewType } = useParams<{ dataViewType: ReportViewType }>();

  const { series } = useUrlStorage(seriesId);

  return (
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
      <EuiFlexItem>
        <EuiText>
          <h2>{DataViewLabels[dataViewType]}</h2>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <MetricSelection seriesId={seriesId} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <ChartTypes seriesId={seriesId} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          iconType="lensApp"
          fullWidth={false}
          isDisabled={!lens.canUseEditor() || lensAttributes === null}
          onClick={() => {
            if (lensAttributes) {
              lens.navigateToPrefilledEditor({
                id: '',
                timeRange: series.time,
                attributes: lensAttributes,
              });
            }
          }}
        >
          Open in Lens
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <ChartTemplates />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
