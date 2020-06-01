/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexItem } from '@elastic/eui';
import darkTheme from '@elastic/eui/dist/eui_theme_dark.json';
import lightTheme from '@elastic/eui/dist/eui_theme_light.json';
import { getOr } from 'lodash/fp';
import React from 'react';

import { DEFAULT_DARK_MODE } from '../../../../common/constants';
import { DescriptionList } from '../../../../common/utility_types';
import { useUiSetting$ } from '../../../common/lib/kibana';
import { getEmptyTagValue } from '../../../common/components/empty_value';
import { DefaultFieldRenderer } from '../../../timelines/components/field_renderers/field_renderers';
import { InspectButton, InspectButtonContainer } from '../../../common/components/inspect';
import { HostItem } from '../../../graphql/types';
import { Loader } from '../../../common/components/loader';
import { DescriptionListStyled, OverviewWrapper } from '../../../common/components/page';

import * as i18n from './translations';

interface Props {
  data: HostItem;
  id: string;
  loading: boolean;
}

const getDescriptionList = (descriptionList: DescriptionList[], key: number) => (
  <EuiFlexItem key={key}>
    <DescriptionListStyled listItems={descriptionList} />
  </EuiFlexItem>
);

export const EndpointOverview = React.memo<Props>(({ data, loading, id }) => {
  const [darkMode] = useUiSetting$<boolean>(DEFAULT_DARK_MODE);

  const getDefaultRenderer = (fieldName: string, fieldData: HostItem) => (
    <DefaultFieldRenderer
      rowItems={getOr([], fieldName, fieldData)}
      attrName={fieldName}
      idPrefix="endpoint-overview"
    />
  );
  const columnOne: DescriptionList[] = [
    {
      title: i18n.ENDPOINT_POLICY,
      description: data.endpointPolicy
        ? getDefaultRenderer('host.endpoint.endpointPolicy', data)
        : getEmptyTagValue(),
    },
  ];
  const columnTwo: DescriptionList[] = [
    {
      title: i18n.POLICY_STATUS,
      description: data.policyStatus
        ? getDefaultRenderer('host.endpoint.policyStatus', data)
        : getEmptyTagValue(),
    },
  ];
  const columnThree: DescriptionList[] = [
    {
      title: i18n.SENSORVERSION,
      description: data.sensorversion
        ? getDefaultRenderer('host.endpoint.sensorversion', data)
        : getEmptyTagValue(),
    },
  ];

  const descriptionLists: Readonly<DescriptionList[][]> = [columnOne, columnTwo, columnThree];

  return (
    <InspectButtonContainer>
      <OverviewWrapper>
        <InspectButton queryId={id} title={i18n.INSPECT_TITLE} inspectIndex={0} />

        {descriptionLists.map((descriptionList, index) =>
          getDescriptionList(descriptionList, index)
        )}

        {loading && (
          <Loader
            overlay
            overlayBackground={
              darkMode ? darkTheme.euiPageBackgroundColor : lightTheme.euiPageBackgroundColor
            }
            size="xl"
          />
        )}
      </OverviewWrapper>
    </InspectButtonContainer>
  );
});

EndpointOverview.displayName = 'EndpointOverview';
