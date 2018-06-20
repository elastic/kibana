/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import {
  unit,
  px,
  fontFamilyCode,
  fontSizes,
  truncate
} from '../../../../style/variables';
import { RelativeLink } from '../../../../utils/url';
import { KuiTableRow, KuiTableRowCell } from '@kbn/ui-framework/components';
import { RIGHT_ALIGNMENT, EuiBadge } from '@elastic/eui';
import TooltipOverlay from '../../../shared/TooltipOverlay';
import numeral from '@elastic/numeral';
import moment from 'moment';

const GroupIdCell = styled(KuiTableRowCell)`
  max-width: none;
  width: 100px;
`;

const GroupIdLink = styled(RelativeLink)`
  font-family: ${fontFamilyCode};
`;

const MessageAndCulpritCell = styled(KuiTableRowCell)`
  ${truncate(px(unit * 32))};
`;

const MessageLink = styled(RelativeLink)`
  font-family: ${fontFamilyCode};
  font-size: ${fontSizes.large};
  ${truncate('100%')};
`;

const Culprit = styled.div`
  font-family: ${fontFamilyCode};
`;

const UnhandledCell = styled(KuiTableRowCell)`
  max-width: none;
  width: 100px;
`;

const OccurrenceCell = styled(KuiTableRowCell)`
  max-width: none;
`;

function ListItem({ error, serviceName }) {
  const {
    groupId,
    culprit,
    message,
    handled,
    occurrenceCount,
    latestOccurrenceAt
  } = error;

  const isUnhandled = handled === false;
  const count = occurrenceCount
    ? numeral(occurrenceCount).format('0.[0]a')
    : 'N/A';
  const timeAgo = latestOccurrenceAt
    ? moment(latestOccurrenceAt).fromNow()
    : 'N/A';

  return (
    <KuiTableRow>
      <GroupIdCell>
        <GroupIdLink path={`/${serviceName}/errors/${groupId}`}>
          {groupId.slice(0, 5) || 'N/A'}
        </GroupIdLink>
      </GroupIdCell>
      <MessageAndCulpritCell>
        <TooltipOverlay content={message || 'N/A'}>
          <MessageLink path={`/${serviceName}/errors/${groupId}`}>
            {message || 'N/A'}
          </MessageLink>
        </TooltipOverlay>
        <TooltipOverlay content={culprit || 'N/A'}>
          <Culprit>{culprit || 'N/A'}</Culprit>
        </TooltipOverlay>
      </MessageAndCulpritCell>
      <UnhandledCell align={RIGHT_ALIGNMENT}>
        {isUnhandled && <EuiBadge color="warning">Unhandled</EuiBadge>}
      </UnhandledCell>
      <OccurrenceCell align={RIGHT_ALIGNMENT}>{count}</OccurrenceCell>
      <OccurrenceCell align={RIGHT_ALIGNMENT}>{timeAgo}</OccurrenceCell>
    </KuiTableRow>
  );
}

export default ListItem;
