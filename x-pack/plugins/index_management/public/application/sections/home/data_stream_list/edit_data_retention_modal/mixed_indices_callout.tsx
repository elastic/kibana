/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { ScopedHistory } from '@kbn/core-application-browser';
import { getIndexListUri } from '../../../../..';
import { useAppContext } from '../../../../app_context';

interface MixedIndicesCalloutProps {
  history: ScopedHistory;
  ilmPolicyLink?: string;
  ilmPolicyName?: string;
  dataStreamName: string;
}

export const MixedIndicesCallout = ({
  ilmPolicyLink,
  ilmPolicyName,
  dataStreamName,
  history,
}: MixedIndicesCalloutProps) => {
  const { core } = useAppContext();

  return (
    <EuiCallOut
      title={i18n.translate(
        'xpack.idxMgmt.dataStreamsDetailsPanel.editDataRetentionModal.someManagedByILMTitle',
        { defaultMessage: 'Some indices are managed by ILM' }
      )}
      color="warning"
      iconType="warning"
      data-test-subj="someIndicesAreManagedByILMCallout"
    >
      <p>
        <FormattedMessage
          id="xpack.idxMgmt.dataStreamsDetailsPanel.editDataRetentionModal.someManagedByILMBody"
          defaultMessage="One or more indices are managed by an ILM policy ({viewAllIndicesLink}). Updating data retention for this data stream won't affect these indices. Instead you will have to update the {ilmPolicyLink} policy."
          values={{
            ilmPolicyLink: (
              <EuiLink
                data-test-subj="viewIlmPolicyLink"
                onClick={() => core.application.navigateToUrl(ilmPolicyLink)}
              >
                {ilmPolicyName}
              </EuiLink>
            ),
            viewAllIndicesLink: (
              <EuiLink
                {...reactRouterNavigate(
                  history,
                  getIndexListUri(`data_stream="${dataStreamName}"`, true)
                )}
                data-test-subj="viewAllIndicesLink"
              >
                <FormattedMessage
                  id="xpack.idxMgmt.dataStreamsDetailsPanel.editDataRetentionModal.viewAllIndices"
                  defaultMessage="view indices"
                />
              </EuiLink>
            ),
          }}
        />
      </p>
    </EuiCallOut>
  );
};
