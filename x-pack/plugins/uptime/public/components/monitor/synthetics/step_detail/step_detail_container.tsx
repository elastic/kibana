/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { getJourneySteps } from '../../../../state/actions/journey';
import { journeySelector } from '../../../../state/selectors';
import { useUiSetting$ } from '../../../../../../../../src/plugins/kibana_react/public';
import { StepDetail } from './step_detail';
import { useMonitorBreadcrumb } from './use_monitor_breadcrumb';

export const NO_STEP_DATA = i18n.translate('xpack.uptime.synthetics.stepDetail.noData', {
  defaultMessage: 'No data could be found for this step',
});

interface Props {
  checkGroup: string;
  stepIndex: number;
}

export const StepDetailContainer: React.FC<Props> = ({ checkGroup, stepIndex }) => {
  const dispatch = useDispatch();
  const history = useHistory();

  const [dateFormat] = useUiSetting$<string>('dateFormat');

  useEffect(() => {
    if (checkGroup) {
      dispatch(getJourneySteps({ checkGroup, syntheticEventTypes: ['step/end'] }));
    }
  }, [dispatch, checkGroup]);

  const journeys = useSelector(journeySelector);
  const journey = journeys[checkGroup ?? ''];

  const { activeStep, hasPreviousStep, hasNextStep } = useMemo(() => {
    return {
      hasPreviousStep: stepIndex > 1 ? true : false,
      activeStep: journey?.steps?.find((step) => step.synthetics?.step?.index === stepIndex),
      hasNextStep: journey && journey.steps && stepIndex < journey.steps.length ? true : false,
    };
  }, [stepIndex, journey]);

  useMonitorBreadcrumb({ journey, activeStep });

  const handleNextStep = useCallback(() => {
    history.push(`/journey/${checkGroup}/step/${stepIndex + 1}`);
  }, [history, checkGroup, stepIndex]);

  const handlePreviousStep = useCallback(() => {
    history.push(`/journey/${checkGroup}/step/${stepIndex - 1}`);
  }, [history, checkGroup, stepIndex]);

  const handleNextRun = useCallback(() => {
    history.push(`/journey/${journey?.details?.next?.checkGroup}/step/1`);
  }, [history, journey?.details?.next?.checkGroup]);

  const handlePreviousRun = useCallback(() => {
    history.push(`/journey/${journey?.details?.previous?.checkGroup}/step/1`);
  }, [history, journey?.details?.previous?.checkGroup]);

  return (
    <>
      <EuiPanel>
        {(!journey || journey.loading) && (
          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="xl" />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
        {journey && !activeStep && !journey.loading && (
          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem>
              <EuiText textAlign="center">
                <p>{NO_STEP_DATA}</p>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
        {journey && activeStep && !journey.loading && (
          <StepDetail
            checkGroup={checkGroup}
            stepName={activeStep.synthetics?.step?.name}
            stepIndex={stepIndex}
            totalSteps={journey.steps.length}
            hasPreviousStep={hasPreviousStep}
            hasNextStep={hasNextStep}
            handlePreviousStep={handlePreviousStep}
            handleNextStep={handleNextStep}
            handleNextRun={handleNextRun}
            handlePreviousRun={handlePreviousRun}
            previousCheckGroup={journey.details?.previous?.checkGroup}
            nextCheckGroup={journey.details?.next?.checkGroup}
            checkTimestamp={journey.details?.timestamp}
            dateFormat={dateFormat}
          />
        )}
      </EuiPanel>
    </>
  );
};
