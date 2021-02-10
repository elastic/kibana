/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { useHistory } from 'react-router-dom';
import moment from 'moment';
import { useUiSetting$ } from '../../../../../../src/plugins/kibana_react/public';
import { SyntheticsJourneyApiResponse } from '../../../common/runtime_types/ping';

interface Props {
  timestamp: string;
  details: SyntheticsJourneyApiResponse['details'];
}

export const ChecksNavigation = ({ timestamp, details }: Props) => {
  const [dateFormat] = useUiSetting$<string>('dateFormat');

  const history = useHistory();

  return (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem>
        <EuiButtonEmpty
          iconType="arrowLeft"
          isDisabled={!details?.previous}
          onClick={() => {
            history.push(`/journey/${details?.previous?.checkGroup}/steps`);
          }}
        >
          <FormattedMessage
            id="xpack.uptime.synthetics.stepList.previousCheck"
            defaultMessage="Previous check"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText className="eui-textNoWrap">
          {moment(timestamp).format(dateFormat).toString()}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiButtonEmpty
          iconType="arrowRight"
          iconSide="right"
          isDisabled={!details?.next}
          onClick={() => {
            history.push(`/journey/${details?.next?.checkGroup}/steps`);
          }}
        >
          <FormattedMessage
            id="xpack.uptime.synthetics.stepList.previousCheck"
            defaultMessage="Next check"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
