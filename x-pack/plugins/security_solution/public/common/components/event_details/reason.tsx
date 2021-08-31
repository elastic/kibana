/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTextColor, EuiFlexItem, EuiSpacer, EuiHorizontalRule, EuiTitle } from '@elastic/eui';
import React, { useMemo } from 'react';

import styled from 'styled-components';
import { getRuleDetailsUrl, useFormatUrl } from '../link_to';
import * as i18n from './translations';
import { TimelineEventsDetailsItem } from '../../../../common';
import { LinkAnchor } from '../links';
import { useKibana } from '../../lib/kibana';
import { APP_ID, SecurityPageName } from '../../../../common/constants';
import { EVENT_DETAILS_PLACEHOLDER } from '../../../timelines/components/side_panel/event_details/translations';
import { getFieldValue } from '../../../detections/components/host_isolation/helpers';

interface Props {
  data: TimelineEventsDetailsItem[];
  eventId: string;
}

export const Indent = styled.div`
  padding: 0 8px;
  word-break: break-word;
  line-height: 1.7em;
`;

export const ReasonComponent: React.FC<Props> = ({ eventId, data }) => {
  const { navigateToApp } = useKibana().services.application;
  const { formatUrl } = useFormatUrl(SecurityPageName.rules);

  const reason = useMemo(
    () => getFieldValue({ category: 'signal', field: 'signal.reason' }, data),
    [data]
  );

  const ruleId = useMemo(
    () => getFieldValue({ category: 'signal', field: 'signal.rule.id' }, data),
    [data]
  );

  if (!eventId) {
    return <EuiTextColor color="subdued">{EVENT_DETAILS_PLACEHOLDER}</EuiTextColor>;
  }

  return reason ? (
    <EuiFlexItem grow={false}>
      <EuiSpacer size="l" />
      <EuiTitle size="xxxs">
        <h5>{i18n.REASON}</h5>
      </EuiTitle>
      <EuiSpacer size="s" />

      <Indent>{reason}</Indent>

      <EuiSpacer size="s" />

      <Indent>
        <LinkAnchor
          data-test-subj="ruleName"
          onClick={(ev: { preventDefault: () => void }) => {
            ev.preventDefault();
            navigateToApp(APP_ID, {
              deepLinkId: SecurityPageName.rules,
              path: getRuleDetailsUrl(ruleId),
            });
          }}
          href={formatUrl(getRuleDetailsUrl(ruleId))}
        >
          {i18n.VIEW_RULE_DETAIL_PAGE}
        </LinkAnchor>
      </Indent>

      <EuiHorizontalRule />
    </EuiFlexItem>
  ) : null;
};

ReasonComponent.displayName = 'ReasonComponent';

export const Reason = React.memo(ReasonComponent);
