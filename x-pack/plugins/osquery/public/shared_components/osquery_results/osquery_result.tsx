/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComment, EuiSpacer } from '@elastic/eui';
import React, { useLayoutEffect, useState } from 'react';
import { FormattedRelative } from '@kbn/i18n-react';

import type { OsqueryActionResultsProps } from './types';
import { useLiveQueryDetails } from '../../actions/use_live_query_details';
import { ATTACHED_QUERY } from '../../agents/translations';
import { PackQueriesStatusTable } from '../../live_queries/form/pack_queries_status_table';
import { AlertAttachmentContext } from '../../common/contexts';

interface OsqueryResultProps extends OsqueryActionResultsProps {
  actionId: string;
  queryId: string;
  startDate: string;
}

// eslint-disable-next-line react/display-name
export const OsqueryResult = React.memo<OsqueryResultProps>(
  ({ actionId, ruleName, startDate, ecsData }) => {
    const [isLive, setIsLive] = useState(false);
    const { data } = useLiveQueryDetails({
      actionId,
      isLive,
    });

    useLayoutEffect(() => {
      setIsLive(() => !(data?.status === 'completed'));
    }, [data?.status]);

    return (
      <AlertAttachmentContext.Provider value={ecsData}>
        <EuiSpacer size="s" />
        <EuiComment
          username={ruleName}
          timestamp={<FormattedRelative value={startDate} />}
          event={ATTACHED_QUERY}
          data-test-subj={'osquery-results-comment'}
        >
          <PackQueriesStatusTable
            actionId={actionId}
            data={data?.queries}
            startDate={data?.['@timestamp']}
            expirationDate={data?.expiration}
            agentIds={data?.agents}
          />
        </EuiComment>
        <EuiSpacer size="s" />
      </AlertAttachmentContext.Provider>
    );
  }
);
