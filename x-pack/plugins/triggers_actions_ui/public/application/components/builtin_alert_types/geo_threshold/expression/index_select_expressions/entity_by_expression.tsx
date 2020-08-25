/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AlertTypeParamsExpressionProps } from '../../../../../../types';
import { GeoThresholdAlertParams } from '../../types';
import { AlertsContextValue } from '../../../../../context/alerts_context';
import { SingleFieldSelect } from '../single_field_select';
import { ExpressionWithPopover } from '../expression_with_popover';

export const EntityByExpression: React.FunctionComponent<AlertTypeParamsExpressionProps<
  GeoThresholdAlertParams,
  AlertsContextValue
>> = ({ errors, entity, setAlertParamsEntity, indexFields }) => {

  const indexPopover = (
    <EuiFormRow
      id="someSelect"
      fullWidth
      isInvalid={false /* TODO: Determine error conditions */}
      error={errors.index}
    >
      <SingleFieldSelect
        placeholder={i18n.translate(
          'xpack.maps.source.esSearch.topHitsSplitFieldSelectPlaceholder',
          {
            defaultMessage: 'Select entity field',
          }
        )}
        value={entity}
        onChange={(_entity) => setAlertParamsEntity(_entity)}
        fields={indexFields}
        isClearable={false}
        compressed
      />
    </EuiFormRow>
  );

  return (
    <ExpressionWithPopover
      value={entity}
      defaultValue={'Select entity field'}
      popoverContent={indexPopover}
      expressionDescription={i18n.translate(
        'xpack.triggersActionsUI.sections.alertAdd.geoThreshold.entityByLabel',
        {
          defaultMessage: 'by',
        }
      )}
    />
  );
};
