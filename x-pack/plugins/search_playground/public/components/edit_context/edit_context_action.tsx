/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { useFormContext } from 'react-hook-form';
import { FormattedMessage } from '@kbn/i18n-react';
import { ChatForm } from '../../types';
import { EditContextFlyout } from './edit_context_flyout';

export const EditContextAction: React.FC = () => {
  const { watch } = useFormContext<ChatForm>();
  const [showFlyout, setShowFlyout] = useState(false);
  const selectedIndices: string[] = watch('indices');

  const closeFlyout = () => setShowFlyout(false);

  return (
    <>
      {showFlyout && <EditContextFlyout onClose={closeFlyout} />}
      <EuiButtonEmpty onClick={() => setShowFlyout(true)} disabled={selectedIndices?.length === 0}>
        <FormattedMessage
          id="xpack.searchPlayground.editContext.actionButtonLabel"
          defaultMessage="Edit Context"
        />
      </EuiButtonEmpty>
    </>
  );
};
