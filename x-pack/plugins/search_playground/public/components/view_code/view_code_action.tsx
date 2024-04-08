/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButton } from '@elastic/eui';
import { useFormContext } from 'react-hook-form';
import { FormattedMessage } from '@kbn/i18n-react';
import { ChatForm, ChatFormFields } from '../../types';
import { ViewCodeFlyout } from './view_code_flyout';

export const ViewCodeAction: React.FC = () => {
  const { watch } = useFormContext<ChatForm>();
  const [showFlyout, setShowFlyout] = useState(false);
  const selectedIndices = watch(ChatFormFields.indices);

  return (
    <>
      {showFlyout && <ViewCodeFlyout onClose={() => setShowFlyout(false)} />}
      <EuiButton
        iconType="editorCodeBlock"
        color="primary"
        fill
        onClick={() => setShowFlyout(true)}
        disabled={!selectedIndices || selectedIndices?.length === 0}
      >
        <FormattedMessage
          id="xpack.searchPlayground.viewCode.actionButtonLabel"
          defaultMessage="View code"
        />
      </EuiButton>
    </>
  );
};
