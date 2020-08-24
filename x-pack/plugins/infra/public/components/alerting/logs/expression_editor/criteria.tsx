/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { IFieldType } from 'src/plugins/data/public';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { IErrorObject } from '../../../../../../triggers_actions_ui/public/types';
import { Criterion } from './criterion';
import {
  LogDocumentCountAlertParams,
  Criterion as CriterionType,
} from '../../../../../common/alerting/logs/types';
import { AlertsContext } from './editor';
import { CriterionPreview } from './criterion_preview_chart';

interface Props {
  fields: IFieldType[];
  criteria?: LogDocumentCountAlertParams['criteria'];
  updateCriterion: (idx: number, params: Partial<CriterionType>) => void;
  removeCriterion: (idx: number) => void;
  errors: IErrorObject;
  alertParams: Partial<LogDocumentCountAlertParams>;
  context: AlertsContext;
  sourceId: string;
}

export const Criteria: React.FC<Props> = ({
  fields,
  criteria,
  updateCriterion,
  removeCriterion,
  errors,
  alertParams,
  context,
  sourceId,
}) => {
  if (!criteria) return null;
  return (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem grow>
        {criteria.map((criterion, idx) => {
          return (
            <React.Fragment key={idx}>
              <Criterion
                idx={idx}
                fields={fields}
                criterion={criterion}
                updateCriterion={updateCriterion}
                removeCriterion={removeCriterion}
                canDelete={criteria.length > 1}
                errors={errors[idx.toString()] as IErrorObject}
              />
              <CriterionPreview
                alertParams={alertParams}
                context={context}
                chartCriterion={criterion}
                sourceId={sourceId}
              />
            </React.Fragment>
          );
        })}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
