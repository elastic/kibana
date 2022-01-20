/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useHistory } from 'react-router-dom';
import moment from 'moment';
import { SyntheticsJourneyApiResponse } from '../../../common/runtime_types/ping';
import { getShortTimeStamp } from '../../components/overview/monitor_list/columns/monitor_status_column';
import { useBreakpoints } from '../../../public/hooks/use_breakpoints';

interface Props {
  timestamp: string;
  details: SyntheticsJourneyApiResponse['details'];
}

export const ChecksNavigation = ({ timestamp, details }: Props) => {
  const history = useHistory();
  const { down } = useBreakpoints();

  const isMobile = down('s');

  return (
    <EuiFlexGroup alignItems="center" responsive={false} gutterSize="none">
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size={isMobile ? 'xs' : 'm'}
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
      <EuiFlexItem grow={false}>
        <EuiText size={isMobile ? 'xs' : 'm'} className="eui-textNoWrap">
          {getShortTimeStamp(moment(timestamp))}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size={isMobile ? 'xs' : 'm'}
          iconType="arrowRight"
          iconSide="right"
          isDisabled={!details?.next}
          onClick={() => {
            history.push(`/journey/${details?.next?.checkGroup}/steps`);
          }}
        >
          <FormattedMessage
            id="xpack.uptime.synthetics.stepList.nextCheck"
            defaultMessage="Next check"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
