/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n-react';
import { RESPONSE_DETAILS_TEST_ID } from './test_ids';
import { useDocumentDetailsContext } from '../../shared/context';
import { useResponseActionsView } from '../hooks/use_response_actions_view';

const ExtendedFlyoutWrapper = styled.div`
 figure {
  background-color: white
`;

/**
 * Automated response actions results, displayed in the document details expandable flyout left section under the Insights tab, Response tab
 */
export const ResponseDetails: React.FC = () => {
  const { searchHit, dataAsNestedObject, isPreview } = useDocumentDetailsContext();

  const responseActionsView = useResponseActionsView({
    rawEventData: searchHit,
    ecsData: dataAsNestedObject,
  });

  return (
    <div data-test-subj={RESPONSE_DETAILS_TEST_ID}>
      {isPreview ? (
        <FormattedMessage
          id="xpack.securitySolution.flyout.left.response.previewMessage"
          defaultMessage="Response is not available in alert preview."
        />
      ) : (
        <>
          <EuiTitle size="xxxs">
            <h5>
              <FormattedMessage
                id="xpack.securitySolution.flyout.left.response.responseTitle"
                defaultMessage="Responses"
              />
            </h5>
          </EuiTitle>
          <EuiSpacer size="s" />

          <ExtendedFlyoutWrapper>{responseActionsView?.content}</ExtendedFlyoutWrapper>
        </>
      )}
    </div>
  );
};

ResponseDetails.displayName = 'ResponseDetails';
