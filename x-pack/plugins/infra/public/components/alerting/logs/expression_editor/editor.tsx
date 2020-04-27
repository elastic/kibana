/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo, useEffect, useState } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  ForLastExpression,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../../../triggers_actions_ui/public/common';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { IErrorObject } from '../../../../../../triggers_actions_ui/public/types';
import { useSource } from '../../../../containers/source';
import {
  LogDocumentCountAlertParams,
  Comparator,
  TimeUnit,
} from '../../../../../common/alerting/logs/types';
import { DocumentCount } from './document_count';
import { Criteria } from './criteria';

export interface ExpressionCriteria {
  field?: string;
  comparator?: Comparator;
  value?: string | number;
}

interface Props {
  errors: IErrorObject;
  alertParams: Partial<LogDocumentCountAlertParams>;
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
  const [hasSetDefaults, setHasSetDefaults] = useState<boolean>(false);
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
      setHasSetDefaults(true);
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
      const nextCriteria = alertParams?.criteria?.filter((criterion, index) => {
        return index !== idx;
      });
      setAlertParams('criteria', nextCriteria);
    },
    [alertParams, setAlertParams]
  );

  // Wait until field info has loaded
  if (supportedFields.length === 0) return null;
  // Wait until the alert param defaults have been set
  if (!hasSetDefaults) return null;

  return (
    <>
      <DocumentCount
        comparator={alertParams.count?.comparator}
        value={alertParams.count?.value}
        updateCount={updateCount}
        errors={errors.count as IErrorObject}
      />

      <Criteria
        fields={supportedFields}
        criteria={alertParams.criteria}
        updateCriterion={updateCriterion}
        removeCriterion={removeCriterion}
        errors={errors.criteria as IErrorObject}
      />

      <ForLastExpression
        timeWindowSize={timeSize}
        timeWindowUnit={timeUnit}
        onChangeWindowSize={updateTimeSize}
        onChangeWindowUnit={updateTimeUnit}
        errors={errors as { [key: string]: string[] }}
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
