/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { EuiAccordion, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import { StepsList } from '../../../synthetics/check_steps/steps_list';
import { JourneyStep } from '../../../../../common/runtime_types';
import { useBrowserRunOnceMonitors } from './use_browser_run_once_monitors';
import { TestResultHeader } from '../test_result_header';

interface Props {
  monitorId: string;
}
export const BrowserTestRunResult = ({ monitorId }: Props) => {
  const { data, loading, stepEnds, journeyStarted, summaryDoc } = useBrowserRunOnceMonitors({
    monitorId,
  });

  const hits = data?.hits.hits;
  const doc = hits?.[0]?._source as JourneyStep;

  const getButtonContent = (
    <div>
      <TestResultHeader
        summaryDocs={summaryDoc ? [summaryDoc] : []}
        doc={doc}
        journeyStarted={journeyStarted}
        isCompleted={Boolean(summaryDoc)}
      />
      <EuiText size="s">
        <p>
          <EuiText color="subdued">
            {i18n.translate('xpack.uptime.monitorManagement.stepCompleted', {
              defaultMessage: '{noOfSteps} steps completed',
              values: { noOfSteps: stepEnds.length },
            })}
          </EuiText>
        </p>
      </EuiText>
    </div>
  );

  return (
    <AccordionWrapper
      id={monitorId}
      element="fieldset"
      className="euiAccordionForm"
      buttonClassName="euiAccordionForm__button"
      buttonContent={getButtonContent}
      paddingSize="s"
    >
      {summaryDoc && stepEnds.length === 0 && <EuiText color="danger">{FAILED_TO_RUN}</EuiText>}
      {!summaryDoc && journeyStarted && stepEnds.length === 0 && <EuiText>{LOADING_STEPS}</EuiText>}
      {stepEnds.length > 0 && (
        <StepsList
          data={stepEnds}
          compactView={true}
          loading={Boolean(loading)}
          error={undefined}
        />
      )}
    </AccordionWrapper>
  );
};

const AccordionWrapper = styled(EuiAccordion)`
  .euiAccordion__buttonContent {
    width: 100%;
  }
`;

const FAILED_TO_RUN = i18n.translate('xpack.uptime.monitorManagement.failedRun', {
  defaultMessage: 'Failed to run steps',
});

const LOADING_STEPS = i18n.translate('xpack.uptime.monitorManagement.loadingSteps', {
  defaultMessage: 'Loading steps...',
});
