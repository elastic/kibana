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
  errors: IErrorObject[];
  alertParams: LogsDocumentCountExpression;
  setAlertParams(key: string, value: any): void;
  setAlertProperty(key: string, value: any): void;
}

export const ExpressionEditor: React.FC<Props> = props => {
  const { setAlertParams, alertParams, errors } = props;
  const { source, createDerivedIndexPattern } = useSource({ sourceId: 'default' });
  const [timeSize, setTimeSize] = useState<number | undefined>(1);
  const [timeUnit, setTimeUnit] = useState<TimeUnit>('m');
  const derivedIndexPattern = useMemo(() => createDerivedIndexPattern('logs'), [
    createDerivedIndexPattern,
  ]);

  const defaultExpression = useMemo(() => {
    return {
      count: {
        value: 75,
        comparator: Comparator.GT,
      },
      criteria: [{ field: null, comparator: Comparator.EQ, value: null }],
      timeSize: 5,
      timeUnit: 'm',
    };
  }, []);

  // Set the default expression
  useEffect(() => {
    for (const [key, value] of Object.entries(defaultExpression)) {
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

  return (
    <>
      <DocumentCount
        comparator={alertParams.count?.comparator}
        value={alertParams.count?.value}
        updateCount={updateCount}
      />
    </>
  );
};
