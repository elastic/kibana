/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactElement, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingContent,
  EuiText,
  EuiPopover,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useParams } from 'react-router-dom';
import { useStepDetailLink } from './hooks/use_step_detail_page';
import { useFormatTestRunAt } from '../../utils/monitor_test_result/test_time_formats';
import { useJourneySteps } from '../monitor_details/hooks/use_journey_steps';

export const StepRunDate = () => {
  return (
    <EuiDescriptionList
      listItems={[{ title: ERROR_DURATION, description: <StepPageNavigation /> }]}
    />
  );
};

const ERROR_DURATION = i18n.translate('xpack.synthetics.testDetails.date', {
  defaultMessage: 'Date',
});

export const StepPageNavigation = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const { data } = useJourneySteps();

  let startedAt: string | ReactElement = useFormatTestRunAt(data?.details?.timestamp);

  const { stepIndex } = useParams<{ stepIndex: string; monitorId: string }>();

  const prevHref = useStepDetailLink({
    stepIndex,
    checkGroupId: data?.details?.previous?.checkGroup,
  });

  const nextHref = useStepDetailLink({
    stepIndex,
    checkGroupId: data?.details?.next?.checkGroup,
  });

  if (!startedAt) {
    startedAt = <EuiLoadingContent lines={1} />;
  }

  return (
    <EuiPopover
      closePopover={() => setIsPopoverOpen(false)}
      isOpen={isPopoverOpen}
      button={
        <EuiButtonEmpty
          style={{ height: 20 }}
          onClick={() => setIsPopoverOpen(true)}
          iconType="arrowDown"
          iconSide="right"
          flush="left"
        >
          {startedAt}
        </EuiButtonEmpty>
      }
    >
      <EuiFlexGroup alignItems="center" justifyContent="flexEnd" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            href={prevHref}
            disabled={!prevHref}
            iconType="arrowLeft"
            aria-label={PREVIOUS_CHECK_BUTTON_TEXT}
          >
            {PREVIOUS_CHECK_BUTTON_TEXT}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s" className="eui-textNoWrap">
            {startedAt}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            href={nextHref}
            disabled={!nextHref}
            iconType="arrowRight"
            iconSide="right"
            aria-label={NEXT_CHECK_BUTTON_TEXT}
          >
            {NEXT_CHECK_BUTTON_TEXT}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPopover>
  );
};

export const PREVIOUS_CHECK_BUTTON_TEXT = i18n.translate(
  'xpack.synthetics.synthetics.stepDetail.previousCheckButtonText',
  {
    defaultMessage: 'Previous check',
  }
);

export const NEXT_CHECK_BUTTON_TEXT = i18n.translate(
  'xpack.synthetics.synthetics.stepDetail.nextCheckButtonText',
  {
    defaultMessage: 'Next check',
  }
);
