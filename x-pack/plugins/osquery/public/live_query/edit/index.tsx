/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import { useParams } from 'react-router-dom';

import { useActionDetails } from '../../actions/use_action_details';
import { ResultTabs } from './tabs';
import { LiveQueryForm } from '../form';

const EditLiveQueryPageComponent = () => {
  const { actionId } = useParams<{ actionId: string }>();

  const [loading, { actionDetails }] = useActionDetails({ actionId });

  console.error('actionDetails', actionDetails);

  if (loading) {
    return <>{'LOading...'}</>;
  }

  return (
    <>
      <LiveQueryForm />
      <EuiSpacer />
      <ResultTabs />
    </>
  );
};

export const EditLiveQueryPage = React.memo(EditLiveQueryPageComponent);
