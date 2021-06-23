/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHealth } from '@elastic/eui';
import { getOr } from 'lodash/fp';
import React, { useCallback, useMemo } from 'react';

import { OverviewDescriptionList } from '../../../../common/components/overview_description_list';
import { DescriptionList } from '../../../../../common/utility_types';
import { getEmptyTagValue } from '../../../../common/components/empty_value';
import { DefaultFieldRenderer } from '../../../../timelines/components/field_renderers/field_renderers';
import * as i18n from './translations';
import {
  EndpointFields,
  HostPolicyResponseActionStatus,
} from '../../../../../common/search_strategy/security_solution/hosts';

interface Props {
  contextID?: string;
  data: EndpointFields | null;
}

export const EndpointOverview = React.memo<Props>(({ contextID, data }) => {
  const getDefaultRenderer = useCallback(
    (fieldName: string, fieldData: EndpointFields, attrName: string) => (
      <DefaultFieldRenderer
        rowItems={[getOr('', fieldName, fieldData)]}
        attrName={attrName}
        idPrefix={contextID ? `endpoint-overview-${contextID}` : 'endpoint-overview'}
      />
    ),
    [contextID]
  );
  const descriptionLists: Readonly<DescriptionList[][]> = useMemo(
    () => [
      [
        {
          title: i18n.ENDPOINT_POLICY,
          description:
            data != null && data.endpointPolicy != null ? data.endpointPolicy : getEmptyTagValue(),
        },
      ],
      [
        {
          title: i18n.POLICY_STATUS,
          description:
            data != null && data.policyStatus != null ? (
              <EuiHealth
                aria-label={data.policyStatus}
                color={
                  data.policyStatus === HostPolicyResponseActionStatus.failure
                    ? 'danger'
                    : data.policyStatus
                }
              >
                {data.policyStatus}
              </EuiHealth>
            ) : (
              getEmptyTagValue()
            ),
        },
      ],
      [
        {
          title: i18n.SENSORVERSION,
          description:
            data != null && data.sensorVersion != null
              ? getDefaultRenderer('sensorVersion', data, 'agent.version')
              : getEmptyTagValue(),
        },
      ],
      [], // needs 4 columns for design
    ],
    [data, getDefaultRenderer]
  );

  return (
    <>
      {descriptionLists.map((descriptionList, index) => (
        <OverviewDescriptionList
          dataTestSubj="endpoint-overview"
          descriptionList={descriptionList}
          key={index}
        />
      ))}
    </>
  );
});

EndpointOverview.displayName = 'EndpointOverview';
