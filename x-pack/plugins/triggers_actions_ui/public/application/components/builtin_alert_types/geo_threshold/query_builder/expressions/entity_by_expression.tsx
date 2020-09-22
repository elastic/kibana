/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IErrorObject } from '../../../../../../types';
import { SingleFieldSelect } from '../util_components/single_field_select';
import { ExpressionWithPopover } from '../util_components/expression_with_popover';
import { IFieldType } from '../../../../../../../../../../src/plugins/data/common/index_patterns/fields';

interface Props {
  errors: IErrorObject;
  entity: string;
  setAlertParamsEntity: (entity: string) => void;
  indexFields: IFieldType[];
  isInvalid: boolean;
}

export const EntityByExpression: FunctionComponent<Props> = ({
  errors,
  entity,
  setAlertParamsEntity,
  indexFields,
  isInvalid,
}) => {
  const ENTITY_TYPES = ['string', 'number', 'ip'];
  const indexPopover = (
    <EuiFormRow id="someSelect" fullWidth error={errors.index}>
      <SingleFieldSelect
        placeholder={i18n.translate(
          'xpack.triggersActionsUI.geoThreshold.topHitsSplitFieldSelectPlaceholder',
          {
            defaultMessage: 'Select entity field',
          }
        )}
        value={entity}
        onChange={(_entity) => _entity && setAlertParamsEntity(_entity)}
        fields={indexFields.filter(
          (field: IFieldType) => ENTITY_TYPES.includes(field.type) && !field.name.startsWith('_')
        )}
      />
    </EuiFormRow>
  );

  return (
    <ExpressionWithPopover
      isInvalid={isInvalid}
      value={entity}
      defaultValue={'Select entity field'}
      popoverContent={indexPopover}
      expressionDescription={i18n.translate('xpack.triggersActionsUI.geoThreshold.entityByLabel', {
        defaultMessage: 'by',
      })}
    />
  );
};
