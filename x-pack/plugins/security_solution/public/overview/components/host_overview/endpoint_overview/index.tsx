/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexItem, EuiHealth } from '@elastic/eui';
import { getOr } from 'lodash/fp';
import React, { useCallback, useMemo } from 'react';

import { DescriptionList } from '../../../../../common/utility_types';
import { getEmptyTagValue } from '../../../../common/components/empty_value';
import { DefaultFieldRenderer } from '../../../../timelines/components/field_renderers/field_renderers';
import { EndpointFields, HostPolicyResponseActionStatus } from '../../../../graphql/types';
import { DescriptionListStyled } from '../../../../common/components/page';

import * as i18n from './translations';

interface Props {
  data: EndpointFields | null;
}

const getDescriptionList = (descriptionList: DescriptionList[], key: number) => (
  <EuiFlexItem key={key}>
    <DescriptionListStyled data-test-subj="endpoint-overview" listItems={descriptionList} />
  </EuiFlexItem>
);

export const EndpointOverview = React.memo<Props>(({ data }) => {
  const getDefaultRenderer = useCallback(
    (fieldName: string, fieldData: EndpointFields, attrName: string) => (
      <DefaultFieldRenderer
        rowItems={[getOr('', fieldName, fieldData)]}
        attrName={attrName}
        idPrefix="endpoint-overview"
      />
    ),
    []
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
      {descriptionLists.map((descriptionList, index) => getDescriptionList(descriptionList, index))}
    </>
  );
});

EndpointOverview.displayName = 'EndpointOverview';
