/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { Fragment } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiTextColor } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { MlEntity } from '../../../../embeddables/types';
import { TimeSeriesExplorerHelpPopover } from '../../timeseriesexplorer_help_popover';

// Used to indicate the chart is being plotted across
// all partition field values, where the cardinality of the field cannot be
// obtained as it is not aggregatable e.g. 'all distinct kpi_indicator values'
const allValuesLabel = i18n.translate('xpack.ml.timeSeriesExplorer.allPartitionValuesLabel', {
  defaultMessage: 'all',
});

export const SingleMetricViewerTitle: FC<{
  entityData: { entities: MlEntity[]; count: number };
  functionLabel: string;
}> = ({ entityData, functionLabel }) => (
  <EuiFlexGroup gutterSize="xs" alignItems="center">
    <EuiFlexItem grow={false}>
      <EuiTitle size={'xs'}>
        <h2>
          <span>
            {i18n.translate('xpack.ml.timeSeriesExplorer.singleTimeSeriesAnalysisTitle', {
              defaultMessage: 'Single time series analysis of {functionLabel}',
              values: { functionLabel },
            })}
          </span>
          &nbsp;
          {entityData.count === 1 && (
            <EuiTextColor color={'success'} size={'s'} component={'span'}>
              {entityData.entities.length > 0 && '('}
              {entityData.entities
                .map((entity) => {
                  return `${entity.fieldName}: ${entity.fieldValue}`;
                })
                .join(', ')}
              {entityData.entities.length > 0 && ')'}
            </EuiTextColor>
          )}
          {entityData.count !== 1 && (
            <EuiTextColor color={'success'} size={'s'} component={'span'}>
              {entityData.entities.map((countData, i) => {
                return (
                  <Fragment key={countData.fieldName}>
                    {i18n.translate(
                      'xpack.ml.timeSeriesExplorer.countDataInChartDetailsDescription',
                      {
                        defaultMessage:
                          '{openBrace}{cardinalityValue} distinct {fieldName} {cardinality, plural, one {} other { values}}{closeBrace}',
                        values: {
                          openBrace: i === 0 ? '(' : '',
                          closeBrace: i === entityData.entities.length - 1 ? ')' : '',
                          cardinalityValue:
                            countData.cardinality === 0 ? allValuesLabel : countData.cardinality,
                          cardinality: countData.cardinality,
                          fieldName: countData.fieldName,
                        },
                      }
                    )}
                    {i !== entityData.entities.length - 1 ? ', ' : ''}
                  </Fragment>
                );
              })}
            </EuiTextColor>
          )}
        </h2>
      </EuiTitle>
    </EuiFlexItem>

    <EuiFlexItem grow={false}>
      <TimeSeriesExplorerHelpPopover />
    </EuiFlexItem>
  </EuiFlexGroup>
);
