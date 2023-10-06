/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink, EuiSpacer, EuiTitle } from '@elastic/eui';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n-react';
import { RESPONSE_DETAILS_TEST_ID, RESPONSE_NO_DATA_TEST_ID } from './test_ids';
import { expandDottedObject } from '../../../../common/utils/expand_dotted';
import type {
  ExpandedEventFieldsObject,
  RawEventData,
} from '../../../../common/types/response_actions';
import { useLeftPanelContext } from '../context';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { useOsqueryTab } from '../../../common/components/event_details/osquery_tab';
import { useResponseActionsView } from '../../../common/components/event_details/response_actions_view';

const ExtendedFlyoutWrapper = styled.div`
 figure {
  background-color: white
`;

const InlineBlock = styled.div`
  display: inline-block;
  line-height: 1.7em;
`;

/**
 * Automated response actions results, displayed in the document details expandable flyout left section under the Insights tab, Response tab
 */
export const ResponseDetails: React.FC = () => {
  const { searchHit, dataAsNestedObject } = useLeftPanelContext();
  const endpointResponseActionsEnabled = useIsExperimentalFeatureEnabled(
    'endpointResponseActionsEnabled'
  );
  const expandedEventFieldsObject = searchHit
    ? (expandDottedObject((searchHit as RawEventData).fields) as ExpandedEventFieldsObject)
    : undefined;

  const responseActions =
    expandedEventFieldsObject?.kibana?.alert?.rule?.parameters?.[0].response_actions;

  const responseActionsView = useResponseActionsView({
    rawEventData: searchHit,
    ecsData: dataAsNestedObject,
  });
  const osqueryView = useOsqueryTab({
    rawEventData: searchHit,
    ecsData: dataAsNestedObject,
  });

  return (
    <div data-test-subj={RESPONSE_DETAILS_TEST_ID}>
      <EuiTitle size="xxxs">
        <h5>
          <FormattedMessage
            id="xpack.securitySolution.flyout.left.response.responseTitle"
            defaultMessage="Responses"
          />
        </h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      {!responseActions ? (
        <InlineBlock data-test-subj={RESPONSE_NO_DATA_TEST_ID}>
          <FormattedMessage
            id="xpack.securitySolution.flyout.left.response.noDataDescription"
            defaultMessage="There are no response actions defined for this event. To add some, edit the rule's settings and set up {link}."
            values={{
              link: (
                <EuiLink
                  href="https://www.elastic.co/guide/en/security/current/rules-ui-create.html#rule-response-action"
                  target="_blank"
                >
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.left.response.noDataLinkText"
                    defaultMessage="response actions"
                  />
                </EuiLink>
              ),
            }}
          />
        </InlineBlock>
      ) : (
        <ExtendedFlyoutWrapper>
          {endpointResponseActionsEnabled ? responseActionsView?.content : osqueryView?.content}
        </ExtendedFlyoutWrapper>
      )}
    </div>
  );
};

ResponseDetails.displayName = 'ResponseDetails';
