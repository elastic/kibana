/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { EuiFlexItem, EuiFlexGroup, EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { IFieldType } from 'src/plugins/data/public';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { IErrorObject } from '../../../../../../../triggers_actions_ui/public/types';
import { Criterion } from './criterion';
import {
  AlertParams,
  Comparator,
  Criteria as CriteriaType,
  Criterion as CriterionType,
  CountCriteria as CountCriteriaType,
  RatioCriteria as RatioCriteriaType,
} from '../../../../../../common/alerting/logs/log_threshold/types';
import { AlertsContext } from './editor';
import { CriterionPreview } from './criterion_preview_chart';

const DEFAULT_CRITERIA = { field: 'log.level', comparator: Comparator.EQ, value: 'error' };

interface Props {
  fields: IFieldType[];
  criteria?: AlertParams['criteria'];
  errors: IErrorObject;
  alertParams: Partial<AlertParams>;
  context: AlertsContext;
  sourceId: string;
  updateCriteria: (criteria: AlertParams['criteria']) => void;
}

export const Criteria: React.FC<Props> = (props) => {
  const { criteria } = props;
  if (!criteria || criteria.length === 0) return null;

  return (
    <div>
      {!Array.isArray(criteria[0]) ? (
        <CountCriteria {...props} criteria={criteria as CountCriteriaType} />
      ) : (
        <RatioCriteria {...props} />
      )}
    </div>
  );
};

interface CriteriaWrapperProps {
  alertParams: Partial<AlertParams>;
  fields: IFieldType[];
  updateCriterion: (idx: number, params: Partial<CriterionType>) => void;
  removeCriterion: (idx: number) => void;
  addCriterion: () => void;
  criteria: CriteriaType;
  errors: IErrorObject;
  context: AlertsContext;
  sourceId: string;
}

const CriteriaWrapper: React.FC<CriteriaWrapperProps> = (props) => {
  const {
    updateCriterion,
    removeCriterion,
    addCriterion,
    criteria,
    fields,
    errors,
    alertParams,
    context,
    sourceId,
  } = props;
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
        <AddCriterionButton addCriterion={addCriterion} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const RatioCriteria = () => {
  return null;
};

const CountCriteria: React.FC<Props & { criteria: CountCriteriaType }> = (props) => {
  const { criteria, updateCriteria } = props;

  const handleUpdateCriteria = useCallback(
    (criteriaParam: CriteriaType) => {
      updateCriteria(criteriaParam);
    },
    [updateCriteria]
  );

  const { updateCriterion, addCriterion, removeCriterion } = useCriteriaState(
    criteria,
    handleUpdateCriteria
  );

  return (
    <CriteriaWrapper
      {...props}
      updateCriterion={updateCriterion}
      addCriterion={addCriterion}
      removeCriterion={removeCriterion}
    />
  );
};

const useCriteriaState = (
  criteria: CriteriaType,
  onUpdateCriteria: (criteria: CriteriaType) => void
) => {
  const updateCriterion = useCallback(
    (idx, criterionParams) => {
      const nextCriteria = criteria.map((criterion, index) => {
        return idx === index ? { ...criterion, ...criterionParams } : criterion;
      });
      onUpdateCriteria(nextCriteria);
    },
    [criteria, onUpdateCriteria]
  );

  const addCriterion = useCallback(() => {
    const nextCriteria = criteria ? [...criteria, DEFAULT_CRITERIA] : [DEFAULT_CRITERIA];
    onUpdateCriteria(nextCriteria);
  }, [criteria, onUpdateCriteria]);

  const removeCriterion = useCallback(
    (idx) => {
      const nextCriteria = criteria.filter((criterion, index) => {
        return index !== idx;
      });
      onUpdateCriteria(nextCriteria);
    },
    [criteria, onUpdateCriteria]
  );

  return { updateCriterion, addCriterion, removeCriterion };
};

const AddCriterionButton = ({ addCriterion }) => {
  return (
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
  );
};
