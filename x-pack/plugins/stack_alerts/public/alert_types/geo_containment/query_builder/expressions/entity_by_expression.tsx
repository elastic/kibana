/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useEffect, useRef } from 'react';
import { EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import _ from 'lodash';
import { IErrorObject } from '../../../../../../triggers_actions_ui/public';
import { SingleFieldSelect } from '../util_components/single_field_select';
import { ExpressionWithPopover } from '../util_components/expression_with_popover';
import { IFieldType } from '../../../../../../../../src/plugins/data/common/index_patterns/fields';

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ENTITY_TYPES = ['string', 'number', 'ip'];

  const usePrevious = <T extends unknown>(value: T): T | undefined => {
    const ref = useRef<T>();
    useEffect(() => {
      ref.current = value;
    });
    return ref.current;
  };

  const oldIndexFields = usePrevious(indexFields);
  const fields = useRef<{
    indexFields: IFieldType[];
  }>({
    indexFields: [],
  });
  useEffect(() => {
    if (!_.isEqual(oldIndexFields, indexFields)) {
      fields.current.indexFields = indexFields.filter(
        (field: IFieldType) => ENTITY_TYPES.includes(field.type) && !field.name.startsWith('_')
      );
      if (!entity && fields.current.indexFields.length) {
        setAlertParamsEntity(fields.current.indexFields[0].name);
      }
    }
  }, [ENTITY_TYPES, indexFields, oldIndexFields, setAlertParamsEntity, entity]);

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
