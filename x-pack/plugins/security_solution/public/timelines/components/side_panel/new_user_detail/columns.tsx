/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { useCallback } from 'react';
import { head } from 'lodash/fp';
import { euiLightVars } from '@kbn/ui-theme';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { useDispatch } from 'react-redux';
import { DefaultFieldRenderer } from '../../field_renderers/field_renderers';
import type {
  ManagedUsersTableColumns,
  ManagedUserTable,
  ObservedUsersTableColumns,
  ObservedUserTable,
  UserAnomalies,
} from './types';
import * as i18n from './translations';
import { defaultToEmptyTag } from '../../../../common/components/empty_value';
import { FormattedRelativePreferenceDate } from '../../../../common/components/formatted_date';
import { AnomalyScores } from '../../../../common/components/ml/score/anomaly_scores';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { scoreIntervalToDateTime } from '../../../../common/components/ml/score/score_interval_to_datetime';
import { InputsModelId } from '../../../../common/store/inputs/constants';
import { setAbsoluteRangeDatePicker } from '../../../../common/store/inputs/actions';
import { getSourcererScopeId } from '../../../../helpers';

const fieldColumn: EuiBasicTableColumn<ObservedUserTable | ManagedUserTable> = {
  name: i18n.FIELD_COLUMN_TITLE,
  field: 'label',
  render: (label: string) => (
    <span
      css={css`
        font-weight: ${euiLightVars.euiFontWeightMedium};
        color: ${euiLightVars.euiTitleColor};
      `}
    >
      {label}
    </span>
  ),
};

export const getManagedUserTableColumns = (
  contextID: string,
  scopeId: string,
  isDraggable: boolean
): ManagedUsersTableColumns => [
  fieldColumn,
  {
    name: i18n.VALUES_COLUMN_TITLE,
    field: 'value',
    render: (value: ManagedUserTable['value'], { field }) => {
      return field && value ? (
        <DefaultFieldRenderer
          rowItems={[value]}
          attrName={field}
          idPrefix={contextID ? `managedUser-${contextID}` : 'managedUser'}
          isDraggable={isDraggable}
          sourcererScopeId={getSourcererScopeId(scopeId)}
        />
      ) : (
        defaultToEmptyTag(value)
      );
    },
  },
];

function isAnomalies(
  field: string | undefined,
  values: UserAnomalies | unknown
): values is UserAnomalies {
  return field === 'anomalies';
}

export const getObservedUserTableColumns = (
  contextID: string,
  scopeId: string,
  isDraggable: boolean
): ObservedUsersTableColumns => [
  fieldColumn,
  {
    name: i18n.VALUES_COLUMN_TITLE,
    field: 'values',
    render: (values: ObservedUserTable['values'], { field }) => {
      if (isAnomalies(field, values) && values) {
        return <AnomaliesField anomalies={values} />;
      }

      if (field === '@timestamp') {
        return <FormattedRelativePreferenceDate value={head(values)} />;
      }

      return (
        <DefaultFieldRenderer
          rowItems={values}
          attrName={field}
          idPrefix={contextID ? `observedUser-${contextID}` : 'observedUser'}
          isDraggable={isDraggable}
          sourcererScopeId={getSourcererScopeId(scopeId)}
        />
      );
    },
  },
];

const AnomaliesField = ({ anomalies }: { anomalies: UserAnomalies }) => {
  const { to, from } = useGlobalTime();
  const dispatch = useDispatch();

  const narrowDateRange = useCallback(
    (score, interval) => {
      const fromTo = scoreIntervalToDateTime(score, interval);
      dispatch(
        setAbsoluteRangeDatePicker({
          id: InputsModelId.global,
          from: fromTo.from,
          to: fromTo.to,
        })
      );
    },
    [dispatch]
  );

  return (
    <AnomalyScores
      anomalies={anomalies.anomalies}
      startDate={from}
      endDate={to}
      isLoading={anomalies.isLoading}
      narrowDateRange={narrowDateRange}
      jobNameById={anomalies.jobNameById}
    />
  );
};
