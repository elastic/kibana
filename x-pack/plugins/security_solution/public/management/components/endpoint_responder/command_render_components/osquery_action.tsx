/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../../common/lib/kibana';
import { useSendOsqueryRequest } from '../../../hooks/response_actions/use_send_osquery_request';
import type { ActionRequestComponentProps } from '../types';

export const OsqueryActionResult = memo<
  ActionRequestComponentProps<{ query: string[]; packId: string[]; savedQueryId: string[] }>
>(({ command, setStatus, ResultComponent }) => {
  const osqueryApi = useSendOsqueryRequest(command.args.args);

  const { isLoading, mutateAsync, isSuccess, isError, data } = osqueryApi;
  const {
    services: { osquery },
  } = useKibana();
  const { OsqueryResults } = osquery;
  const endpointId = command.commandDefinition?.meta?.endpointId;
  const endpointIds = useMemo(() => {
    return endpointId ? [endpointId] : [];
  }, [endpointId]);

  useEffect(() => {
    (async () => {
      if (endpointIds.length) {
        await mutateAsync({ endpoint_ids: endpointIds });
      }
    })();
  }, [endpointIds, mutateAsync]);

  useEffect(() => {
    if (isSuccess) {
      setStatus('success');
    } else if (isError) {
      setStatus('error');
    }
  }, [isSuccess, isError, setStatus]);

  if (!isLoading && data) {
    return (
      <ResultComponent
        showAs="success"
        data-test-subj="osquerySuccess"
        title={i18n.translate(
          'xpack.securitySolution.endpointResponseActions.getOsqueryAction.successTitle',
          { defaultMessage: 'Successful' }
        )}
      >
        <OsqueryResults ecsData={null} actionId={data.data.action_id} agentIds={endpointIds} />
      </ResultComponent>
    );
  }

  // TODO handle error state
  // if (isError) {
  //   return (
  //     <ResultComponent showAs="failure">
  //       <FormattedError error={error} />
  //     </ResultComponent>
  //   );
  // }

  return (
    <ResultComponent
      showAs="pending"
      data-test-subj="osqueryLoading"
      title={i18n.translate(
        'xpack.securitySolution.endpointResponseActions.getOsqueryAction.LoadingTitle',
        { defaultMessage: 'Loading' }
      )}
    />
  );
});
OsqueryActionResult.displayName = 'OsqueryActionResult';
