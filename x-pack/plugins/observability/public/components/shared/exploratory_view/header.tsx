/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { TypedLensByValueInput } from '../../../../../lens/public';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { ObservabilityClientPluginsStart } from '../../../plugin';
import { ChartTemplates } from './chart_templates/chart_templates';
import { ChartTypes } from './header/chart_types';
import { DataViewType } from './types';
import { DataViewLabels } from './configurations/constants';

interface Props {
  lensAttributes: TypedLensByValueInput['attributes'];
}

export function ExploratoryViewHeader({ lensAttributes }: Props) {
  const {
    services: { lens },
  } = useKibana<ObservabilityClientPluginsStart>();

  const { dataViewType } = useParams<{ dataViewType: DataViewType }>();

  return (
    <EuiFlexGroup justifyContent="spaceBetween">
      <EuiFlexItem>
        <EuiText>
          <h2>{DataViewLabels[dataViewType]}</h2>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <ChartTypes />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          iconType="lensApp"
          fullWidth={false}
          isDisabled={!lens.canUseEditor()}
          onClick={() => {
            lens.navigateToPrefilledEditor({
              id: '',
              timeRange: {
                from: '2021-01-18T12:19:28.685Z',
                to: '2021-01-18T12:26:20.767Z',
              },
              attributes: lensAttributes,
            });
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
