/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { EuiFlexItem, EuiFlexGroup, EuiButtonEmpty, EuiAccordion, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { IFieldType } from 'src/plugins/data/public';
import { Criterion } from './criterion';
import {
  AlertParams,
  Comparator,
  Criteria as CriteriaType,
  Criterion as CriterionType,
  CountCriteria as CountCriteriaType,
  RatioCriteria as RatioCriteriaType,
  isRatioAlert,
  getNumerator,
  getDenominator,
} from '../../../../../common/alerting/logs/log_threshold/types';
import { Errors, CriterionErrors } from '../../validation';
import { AlertsContext, ExpressionLike } from './editor';
import { CriterionPreview } from './criterion_preview_chart';

const DEFAULT_CRITERIA = { field: 'log.level', comparator: Comparator.EQ, value: 'error' };

const QueryAText = i18n.translate('xpack.infra.logs.alerting.threshold.ratioCriteriaQueryAText', {
  defaultMessage: 'Query A',
});

const QueryBText = i18n.translate('xpack.infra.logs.alerting.threshold.ratioCriteriaQueryBText', {
  defaultMessage: 'Query B',
});

interface SharedProps {
  fields: IFieldType[];
  criteria?: AlertParams['criteria'];
  errors: Errors['criteria'];
  alertParams: Partial<AlertParams>;
  context: AlertsContext;
  sourceId: string;
  updateCriteria: (criteria: AlertParams['criteria']) => void;
}

type CriteriaProps = SharedProps;

export const Criteria: React.FC<CriteriaProps> = (props) => {
  const { criteria, errors } = props;
  if (!criteria || criteria.length === 0) return null;

  return !isRatioAlert(criteria) ? (
    <CountCriteria {...props} criteria={criteria} errors={errors} />
  ) : (
    <RatioCriteria {...props} criteria={criteria} errors={errors} />
  );
};

interface CriteriaWrapperProps {
  alertParams: SharedProps['alertParams'];
  fields: SharedProps['fields'];
  updateCriterion: (idx: number, params: Partial<CriterionType>) => void;
  removeCriterion: (idx: number) => void;
  addCriterion: () => void;
  criteria: CriteriaType;
  errors: CriterionErrors;
  context: SharedProps['context'];
  sourceId: SharedProps['sourceId'];
  isRatio?: boolean;
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
    isRatio = false,
  } = props;

  return (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem grow>
        {criteria.map((criterion, idx) => {
          return (
            <EuiAccordion
              id={`criterion-${idx}`}
              buttonContent={
                <Criterion
                  idx={idx}
                  fields={fields}
                  criterion={criterion}
                  updateCriterion={updateCriterion}
                  removeCriterion={removeCriterion}
                  canDelete={criteria.length > 1}
                  errors={errors[idx]}
                />
              }
              key={idx}
              arrowDisplay="right"
            >
              <CriterionPreview
                alertParams={alertParams}
                context={context}
                chartCriterion={criterion}
                sourceId={sourceId}
                showThreshold={!isRatio}
              />
            </EuiAccordion>
          );
        })}
        <AddCriterionButton addCriterion={addCriterion} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

interface RatioCriteriaProps {
  alertParams: SharedProps['alertParams'];
  fields: SharedProps['fields'];
  criteria: RatioCriteriaType;
  errors: Errors['criteria'];
  context: SharedProps['context'];
  sourceId: SharedProps['sourceId'];
  updateCriteria: (criteria: AlertParams['criteria']) => void;
}

const RatioCriteria: React.FC<RatioCriteriaProps> = (props) => {
  const { criteria, errors, updateCriteria } = props;

  const handleUpdateNumeratorCriteria = useCallback(
    (criteriaParam: CriteriaType) => {
      const nextCriteria: RatioCriteriaType = [criteriaParam, getDenominator(criteria)];
      updateCriteria(nextCriteria);
    },
    [updateCriteria, criteria]
  );

  const handleUpdateDenominatorCriteria = useCallback(
    (criteriaParam: CriteriaType) => {
      const nextCriteria: RatioCriteriaType = [getNumerator(criteria), criteriaParam];
      updateCriteria(nextCriteria);
    },
    [updateCriteria, criteria]
  );

  const {
    updateCriterion: updateNumeratorCriterion,
    addCriterion: addNumeratorCriterion,
    removeCriterion: removeNumeratorCriterion,
  } = useCriteriaState(getNumerator(criteria), handleUpdateNumeratorCriteria);

  const {
    updateCriterion: updateDenominatorCriterion,
    addCriterion: addDenominatorCriterion,
    removeCriterion: removeDenominatorCriterion,
  } = useCriteriaState(getDenominator(criteria), handleUpdateDenominatorCriteria);

  return (
    <>
      <EuiSpacer size="xxl" />

      <ExpressionLike text={QueryAText} />

      <CriteriaWrapper
        {...props}
        criteria={getNumerator(criteria)}
        updateCriterion={updateNumeratorCriterion}
        addCriterion={addNumeratorCriterion}
        removeCriterion={removeNumeratorCriterion}
        errors={errors[0]}
        isRatio={true}
      />

      <EuiSpacer size="l" />

      <ExpressionLike text={QueryBText} />

      <CriteriaWrapper
        {...props}
        criteria={getDenominator(criteria)}
        updateCriterion={updateDenominatorCriterion}
        addCriterion={addDenominatorCriterion}
        removeCriterion={removeDenominatorCriterion}
        errors={errors[1]}
        isRatio={true}
      />
    </>
  );
};

interface CountCriteriaProps {
  alertParams: SharedProps['alertParams'];
  fields: SharedProps['fields'];
  criteria: CountCriteriaType;
  errors: Errors['criteria'];
  context: SharedProps['context'];
  sourceId: SharedProps['sourceId'];
  updateCriteria: (criteria: AlertParams['criteria']) => void;
}

const CountCriteria: React.FC<CountCriteriaProps> = (props) => {
  const { criteria, updateCriteria, errors } = props;

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
      errors={errors[0]}
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

const AddCriterionButton = ({ addCriterion }: { addCriterion: () => void }) => {
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
