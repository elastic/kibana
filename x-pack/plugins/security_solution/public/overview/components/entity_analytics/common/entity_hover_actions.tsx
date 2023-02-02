/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { noop } from 'lodash/fp';
import type { DataProvider } from '../../../../../common/types';
import { IS_OPERATOR } from '../../../../../common/types';
import { escapeDataProviderId } from '../../../../common/components/drag_and_drop/helpers';
import { SecurityPageName } from '../../../../app/types';
import { HoverActions } from '../../../../common/components/hover_actions';

interface Props {
  onFilterAdded?: () => void;
  fieldName: string;
  fieldValue: string;
  idPrefix: string;
}

export const EntityAnalyticsHoverActions: React.FC<Props> = ({
  fieldName,
  fieldValue,
  idPrefix,
  onFilterAdded,
}) => {
  const id = useMemo(
    () => escapeDataProviderId(`${idPrefix}-${fieldName}-${fieldValue}`),
    [idPrefix, fieldName, fieldValue]
  );
  const dataProvider: DataProvider = useMemo(
    () => ({
      and: [],
      enabled: true,
      id,
      name: fieldValue,
      excluded: false,
      kqlQuery: '',
      queryMatch: {
        field: fieldName,
        value: fieldValue,
        displayValue: fieldValue,
        operator: IS_OPERATOR,
      },
    }),
    [fieldName, fieldValue, id]
  );

  return (
    <HoverActions
      applyWidthAndPadding
      closeTopN={noop}
      dataProvider={dataProvider}
      dataType={'string'}
      field={fieldName}
      fieldType={'keyword'}
      hideTopN={true}
      isAggregatable
      isObjectArray={false}
      onFilterAdded={onFilterAdded}
      ownFocus={false}
      scopeId={SecurityPageName.entityAnalytics}
      showTopN={false}
      toggleTopN={noop}
      values={[fieldValue]}
    />
  );
};

EntityAnalyticsHoverActions.displayName = 'EntityAnalyticsHoverActions';
