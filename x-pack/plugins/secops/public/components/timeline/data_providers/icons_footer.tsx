/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiIcon, EuiToolTip } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import moment from 'moment';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';
import { DataProvider } from './data_provider';

const HorizontalBar = styled(EuiHorizontalRule)`
  margin: 4px 0px;
`;

const GroupIcons = styled(EuiFlexGroup)`
  width: 100%;
`;

interface OwnProps {
  dataProvider: DataProvider;
}
export const IconsFooter = pure<OwnProps>(({ dataProvider }: OwnProps) => {
  if (!dataProvider.queryDate || isEmpty(dataProvider.queryDate)) {
    return null;
  }
  const tooltipStr = `${moment(dataProvider.queryDate.from).format('L LTS')} - ${moment(
    dataProvider.queryDate.to
  ).format('L LTS')}`;
  return (
    <>
      <HorizontalBar margin="xs" />
      <GroupIcons
        data-test-subj="data-provider-icons-footer"
        gutterSize="none"
        alignItems="center"
        justifyContent="flexStart"
        direction="row"
      >
        <EuiFlexItem>
          <EuiToolTip data-test-subj="add-tool-tip" content={tooltipStr} position="bottom">
            <EuiIcon type="calendar" />
          </EuiToolTip>
        </EuiFlexItem>
      </GroupIcons>
    </>
  );
});
