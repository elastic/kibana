/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import { useParams } from 'react-router-dom';

import { AgentListPage } from '../../../../fleet/public';

import { OsqueryEditor } from '../../editor';
import { useActionDetails } from '../../actions/use_action_details';
import { ResultTabs } from './tabs';

const EditLiveQueryPageComponent = () => {
  const { actionId } = useParams<{ actionId: string }>();

  const [loading, { actionDetails }] = useActionDetails({ actionId });

  console.error('actionDetails', actionDetails);

  if (loading) {
    return <>{'LOading...'}</>;
  }

  return (
    <>
      <AgentListPage />
      <EuiSpacer />
      <OsqueryEditor defaultValue={actionDetails?._source?.data.commands[0].query} />
      <EuiSpacer />
      <ResultTabs />
    </>
  );
};

export const EditLiveQueryPage = React.memo(EditLiveQueryPageComponent);
