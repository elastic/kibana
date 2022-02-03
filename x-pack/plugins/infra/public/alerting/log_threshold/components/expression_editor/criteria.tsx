/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlexItem, EuiFlexGroup, EuiButtonEmpty, EuiAccordion, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { DataViewField } from 'src/plugins/data_views/common';
import { Criterion } from './criterion';
import {
  PartialRuleParams,
  PartialCountCriteria as PartialCountCriteriaType,
  PartialCriteria as PartialCriteriaType,
  PartialCriterion as PartialCriterionType,
  PartialRatioCriteria as PartialRatioCriteriaType,
  isRatioRule,
  getNumerator,
  getDenominator,
} from '../../../../../common/alerting/logs/log_threshold/types';
import { Errors, CriterionErrors } from '../../validation';
import { ExpressionLike } from './editor';
import { CriterionPreview } from './criterion_preview_chart';

const QueryAText = i18n.translate('xpack.infra.logs.alerting.threshold.ratioCriteriaQueryAText', {
  defaultMessage: 'Query A',
});

const QueryBText = i18n.translate('xpack.infra.logs.alerting.threshold.ratioCriteriaQueryBText', {
  defaultMessage: 'Query B',
});

interface SharedProps {
  fields: DataViewField[];
  criteria?: PartialCriteriaType;
  defaultCriterion: PartialCriterionType;
  errors: Errors['criteria'];
  ruleParams: PartialRuleParams;
  sourceId: string;
  updateCriteria: (criteria: PartialCriteriaType) => void;
}

type CriteriaProps = SharedProps;

export const Criteria: React.FC<CriteriaProps> = (props) => {
  const { criteria, errors } = props;
  if (!criteria || criteria.length === 0) return null;

  return !isRatioRule(criteria) ? (
    <CountCriteria {...props} criteria={criteria} errors={errors} />
  ) : (
    <RatioCriteria {...props} criteria={criteria} errors={errors} />
  );
};

interface CriteriaWrapperProps {
  ruleParams: SharedProps['ruleParams'];
  fields: SharedProps['fields'];
  updateCriterion: (idx: number, params: PartialCriterionType) => void;
  removeCriterion: (idx: number) => void;
  addCriterion: () => void;
  criteria: PartialCountCriteriaType;
  errors: CriterionErrors;
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
    ruleParams,
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
                ruleParams={ruleParams}
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

interface RatioCriteriaProps extends SharedProps {
  criteria: PartialRatioCriteriaType;
}

const RatioCriteria: React.FC<RatioCriteriaProps> = (props) => {
  const { criteria, defaultCriterion, errors, updateCriteria } = props;

  const handleUpdateNumeratorCriteria = useCallback(
    (criteriaParam: PartialCountCriteriaType) => {
      const nextCriteria: PartialRatioCriteriaType = [criteriaParam, getDenominator(criteria)];
      updateCriteria(nextCriteria);
    },
    [updateCriteria, criteria]
  );

  const handleUpdateDenominatorCriteria = useCallback(
    (criteriaParam: PartialCountCriteriaType) => {
      const nextCriteria: PartialRatioCriteriaType = [getNumerator(criteria), criteriaParam];
      updateCriteria(nextCriteria);
    },
    [updateCriteria, criteria]
  );

  const {
    updateCriterion: updateNumeratorCriterion,
    addCriterion: addNumeratorCriterion,
    removeCriterion: removeNumeratorCriterion,
  } = useCriteriaState(getNumerator(criteria), defaultCriterion, handleUpdateNumeratorCriteria);

  const {
    updateCriterion: updateDenominatorCriterion,
    addCriterion: addDenominatorCriterion,
    removeCriterion: removeDenominatorCriterion,
  } = useCriteriaState(getDenominator(criteria), defaultCriterion, handleUpdateDenominatorCriteria);

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

interface CountCriteriaProps extends SharedProps {
  criteria: PartialCountCriteriaType;
}

const CountCriteria: React.FC<CountCriteriaProps> = (props) => {
  const { criteria, defaultCriterion, updateCriteria, errors } = props;

  const { updateCriterion, addCriterion, removeCriterion } = useCriteriaState(
    criteria,
    defaultCriterion,
    updateCriteria
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
  criteria: PartialCountCriteriaType,
  defaultCriterion: PartialCriterionType,
  onUpdateCriteria: (criteria: PartialCountCriteriaType) => void
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
    const nextCriteria = [...criteria, defaultCriterion];
    onUpdateCriteria(nextCriteria);
  }, [criteria, defaultCriterion, onUpdateCriteria]);

  const removeCriterion = useCallback(
    (idx) => {
      const nextCriteria = criteria.filter((_criterion, index) => {
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
