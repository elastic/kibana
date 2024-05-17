/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { ChatForm, ChatFormFields } from '../../types';
import { ViewQueryFlyout } from './view_query_flyout';

export const ViewQueryAction: React.FC = () => {
  const [showFlyout, setShowFlyout] = useState(false);
  const { watch } = useFormContext<ChatForm>();
  const selectedIndices: string[] = watch(ChatFormFields.indices);

  return (
    <>
      {showFlyout && <ViewQueryFlyout onClose={() => setShowFlyout(false)} />}
      <EuiButtonEmpty onClick={() => setShowFlyout(true)} disabled={selectedIndices?.length === 0}>
        <FormattedMessage
          id="xpack.searchPlayground.viewQuery.actionButtonLabel"
          defaultMessage="View query"
        />
      </EuiButtonEmpty>
    </>
  );
};
