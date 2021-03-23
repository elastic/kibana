/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiPanel } from '@elastic/eui';
import { useHistory } from 'react-router-dom';

import { getCaseDetailsUrl } from '../../../common/components/link_to';

// TO DO: Cases RAC UI, reimplement this shiz
// import { useInsertTimeline } from '../use_insert_timeline';
// import { fieldName as descriptionFieldName } from './description';
import { useKibana } from '../../../common/lib/kibana';

// TO DO: Cases RAC UI, reimplement this shiz
// const InsertTimeline = () => {
//   const { setFieldValue, getFormData } = useFormContext();
//   const formData = getFormData();
//   const onTimelineAttached = useCallback(
//     (newValue: string) => setFieldValue(descriptionFieldName, newValue),
//     [setFieldValue]
//   );
//   useInsertTimeline(formData[descriptionFieldName] ?? '', onTimelineAttached);
//   return null;
// };

export const Create = React.memo(() => {
  const { cases } = useKibana().services;
  const history = useHistory();
  const onSuccess = useCallback(
    async ({ id }) => {
      history.push(getCaseDetailsUrl({ id }));
    },
    [history]
  );

  const handleSetIsCancel = useCallback(() => {
    history.push('/');
  }, [history]);

  return (
    <EuiPanel>
      {cases.getCreateCase({
        onCancel: handleSetIsCancel,
        onSuccess,
      })}
    </EuiPanel>
  );
});

Create.displayName = 'Create';
