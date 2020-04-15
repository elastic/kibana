/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo, useEffect, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiSpacer,
  EuiText,
  EuiFormRow,
  EuiButtonEmpty,
} from '@elastic/eui';
import { IFieldType } from 'src/plugins/data/public';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { uniq } from 'lodash';
import { euiStyled } from '../../../../../../observability/public';
import {
  ForLastExpression,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../../../triggers_actions_ui/public/common';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { IErrorObject } from '../../../../../../triggers_actions_ui/public/types';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { useSource } from '../../../../containers/source';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { Comparator, TimeUnit } from '../../../../../server/lib/alerting/log_threshold/types';
import { DocumentCount } from './document_count';
import { Criteria } from './criteria';

export interface LogsDocumentCountExpression {
  count?: {
    value?: number;
    comparator?: Comparator;
  };
  timeSize?: number;
  timeUnit?: TimeUnit;
  criteria?: ExpressionCriteria[];
}

export interface ExpressionCriteria {
  field?: string;
  comparator?: Comparator;
  value?: string | number;
}

interface Props {
  errors: IErrorObject;
  alertParams: LogsDocumentCountExpression;
  setAlertParams(key: string, value: any): void;
  setAlertProperty(key: string, value: any): void;
}

const DEFAULT_CRITERIA = { field: 'log.level', comparator: Comparator.EQ, value: 'error' };

const DEFAULT_EXPRESSION = {
  count: {
    value: 75,
    comparator: Comparator.GT,
  },
  criteria: [DEFAULT_CRITERIA],
  timeSize: 5,
  timeUnit: 'm',
};

export const ExpressionEditor: React.FC<Props> = props => {
  const { setAlertParams, alertParams, errors } = props;
  const { createDerivedIndexPattern } = useSource({ sourceId: 'default' });
  const [timeSize, setTimeSize] = useState<number | undefined>(1);
  const [timeUnit, setTimeUnit] = useState<TimeUnit>('m');
  const derivedIndexPattern = useMemo(() => createDerivedIndexPattern('logs'), [
    createDerivedIndexPattern,
  ]);

  const supportedFields = useMemo(() => {
    if (derivedIndexPattern?.fields) {
      return derivedIndexPattern.fields.filter(field => {
        return (field.type === 'string' || field.type === 'number') && field.searchable;
      });
    } else {
      return [];
    }
  }, [derivedIndexPattern]);

  // Set the default expression (disables exhaustive-deps as we only want to run this once on mount)
  useEffect(() => {
    for (const [key, value] of Object.entries(DEFAULT_EXPRESSION)) {
      setAlertParams(key, value);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateCount = useCallback(
    countParams => {
      const nextCountParams = { ...alertParams.count, ...countParams };
      setAlertParams('count', nextCountParams);
    },
    [alertParams.count, setAlertParams]
  );

  const updateCriterion = useCallback(
    (idx, criterionParams) => {
      const nextCriteria = alertParams.criteria?.map((criterion, index) => {
        return idx === index ? { ...criterion, ...criterionParams } : criterion;
      });
      setAlertParams('criteria', nextCriteria ? nextCriteria : []);
    },
    [alertParams, setAlertParams]
  );

  const updateTimeSize = useCallback(
    (ts: number | undefined) => {
      setTimeSize(ts || undefined);
      setAlertParams('timeSize', ts);
    },
    [setTimeSize, setAlertParams]
  );

  const updateTimeUnit = useCallback(
    (tu: string) => {
      setTimeUnit(tu as TimeUnit);
      setAlertParams('timeUnit', tu);
    },
    [setAlertParams]
  );

  const addCriterion = useCallback(() => {
    const nextCriteria = alertParams?.criteria
      ? [...alertParams.criteria, DEFAULT_CRITERIA]
      : [DEFAULT_CRITERIA];
    setAlertParams('criteria', nextCriteria);
  }, [alertParams, setAlertParams]);

  const removeCriterion = useCallback(
    idx => {
      const nextCriteria = alertParams?.criteria.filter((criterion, index) => {
        return index !== idx;
      });
      setAlertParams('criteria', nextCriteria);
    },
    [alertParams, setAlertParams]
  );

  const emptyError = useMemo(() => {
    return {
      timeSizeUnit: [],
      timeWindowSize: [],
    };
  }, []);

  // Wait until field info has loaded
  if (supportedFields.length === 0) return null;

  return (
    <>
      <DocumentCount
        comparator={alertParams.count?.comparator}
        value={alertParams.count?.value}
        updateCount={updateCount}
        errors={errors.count}
      />

      <Criteria
        fields={supportedFields}
        criteria={alertParams.criteria}
        updateCriterion={updateCriterion}
        removeCriterion={removeCriterion}
        errors={errors.criteria}
      />

      <ForLastExpression
        timeWindowSize={timeSize}
        timeWindowUnit={timeUnit}
        onChangeWindowSize={updateTimeSize}
        onChangeWindowUnit={updateTimeUnit}
        errors={errors}
      />

      <div>
        <EuiButtonEmpty
          color={'primary'}
          iconSide={'left'}
          flush={'left'}
          iconType={'plusInCircleFilled'}
          onClick={addCriterion}
        >
          <FormattedMessage
            id="xpack.infra.logs.alertFlyout.addCondition"
            defaultMessage="Add condition"
          />
        </EuiButtonEmpty>
      </div>
    </>
  );
};
