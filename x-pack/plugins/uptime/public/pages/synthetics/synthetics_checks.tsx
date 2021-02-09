/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPage,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import moment from 'moment';
import { FormattedMessage } from '@kbn/i18n/react';
import { useTrackPageview } from '../../../../observability/public';
import { useInitApp } from '../../hooks/use_init_app';
import { StepsList } from '../../components/synthetics/check_steps/steps_list';
import { useCheckSteps } from '../../components/synthetics/check_steps/use_check_steps';
import { useUiSetting$ } from '../../../../../../src/plugins/kibana_react/public';

export const SyntheticsCheckSteps: React.FC = () => {
  useInitApp();
  useTrackPageview({ app: 'uptime', path: 'syntheticCheckSteps' });
  useTrackPageview({ app: 'uptime', path: 'syntheticCheckSteps', delay: 15000 });

  const { checkGroupId } = useParams<{ checkGroupId: string; stepIndex: string }>();

  const { error, loading, steps, ping, timestamp } = useCheckSteps();

  const [dateFormat] = useUiSetting$<string>('dateFormat');

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle>
            <h1>{ping?.monitor.name}</h1>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiButtonEmpty iconType="arrowLeft">
                <FormattedMessage
                  id="xpack.uptime.synthetics.stepList.previousCheck"
                  defaultMessage="Previous check"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText>{moment(timestamp).format(dateFormat).toString()}</EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiButtonEmpty iconType="arrowRight" iconSide="right">
                <FormattedMessage
                  id="xpack.uptime.synthetics.stepList.previousCheck"
                  defaultMessage="Next check"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer />
      <StepsList data={steps} loading={loading} error={error} />
    </>
  );
};
