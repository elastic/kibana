/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash/fp';
import { EuiSpacer } from '@elastic/eui';
import React, { useCallback } from 'react';
import { useParams } from 'react-router-dom';

import { useActionDetails } from '../../actions/use_action_details';
import { ResultTabs } from './tabs';
import { LiveQueryForm } from '../form';

const EditLiveQueryPageComponent = () => {
  const { actionId } = useParams<{ actionId: string }>();
  const [loading, { actionDetails }] = useActionDetails({ actionId });

  const handleSubmit = useCallback(() => Promise.resolve(), []);

  if (loading) {
    return <>{'Loading...'}</>;
  }

  return (
    <>
      {!isEmpty(actionDetails) && (
        <LiveQueryForm actionDetails={actionDetails} onSubmit={handleSubmit} />
      )}
      <EuiSpacer />
      <ResultTabs />
    </>
  );
};

export const EditLiveQueryPage = React.memo(EditLiveQueryPageComponent);
