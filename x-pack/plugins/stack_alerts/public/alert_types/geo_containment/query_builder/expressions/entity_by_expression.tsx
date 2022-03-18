/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useEffect, useRef } from 'react';
import { EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import _ from 'lodash';
import { DataViewField } from 'src/plugins/data_views/public';
import { IErrorObject } from '../../../../../../triggers_actions_ui/public';
import { SingleFieldSelect } from '../util_components/single_field_select';
import { ExpressionWithPopover } from '../util_components/expression_with_popover';

interface Props {
  errors: IErrorObject;
  entity: string;
  setAlertParamsEntity: (entity: string) => void;
  indexFields: DataViewField[];
  isInvalid: boolean;
}

const ENTITY_TYPES = ['string', 'number', 'ip'];
export function getValidIndexPatternFields(fields: DataViewField[]): DataViewField[] {
  return fields.filter((field) => {
    const isSpecifiedSupportedField = ENTITY_TYPES.includes(field.type);
    const hasLeadingUnderscore = field.name.startsWith('_');
    const isAggregatable = !!field.aggregatable;
    return isSpecifiedSupportedField && isAggregatable && !hasLeadingUnderscore;
  });
}

export const EntityByExpression: FunctionComponent<Props> = ({
  errors,
  entity,
  setAlertParamsEntity,
  indexFields,
  isInvalid,
}) => {
  const usePrevious = <T extends unknown>(value: T): T | undefined => {
    const ref = useRef<T>();
    useEffect(() => {
      ref.current = value;
    });
    return ref.current;
  };

  const oldIndexFields = usePrevious(indexFields);
  const fields = useRef<{
    indexFields: DataViewField[];
  }>({
    indexFields: [],
  });
  useEffect(() => {
    if (!_.isEqual(oldIndexFields, indexFields)) {
      fields.current.indexFields = getValidIndexPatternFields(indexFields);
      if (!entity && fields.current.indexFields.length) {
        setAlertParamsEntity(fields.current.indexFields[0].name);
      }
    }
  }, [indexFields, oldIndexFields, setAlertParamsEntity, entity]);

  const indexPopover = (
    <EuiFormRow id="entitySelect" fullWidth error={errors.index}>
      <SingleFieldSelect
        placeholder={i18n.translate(
          'xpack.stackAlerts.geoContainment.topHitsSplitFieldSelectPlaceholder',
          {
            defaultMessage: 'Select entity field',
          }
        )}
        value={entity}
        onChange={(_entity) => _entity && setAlertParamsEntity(_entity)}
        fields={fields.current.indexFields}
      />
    </EuiFormRow>
  );

  return (
    <ExpressionWithPopover
      isInvalid={isInvalid}
      value={entity}
      defaultValue={'Select entity field'}
      popoverContent={indexPopover}
      expressionDescription={i18n.translate('xpack.stackAlerts.geoContainment.entityByLabel', {
        defaultMessage: 'by',
      })}
    />
  );
};
