/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiCallOut, EuiCode } from '@elastic/eui';

export const ChainedMultifieldsWarning = () => (
  <EuiCallOut
    title={i18n.translate('xpack.idxMgmt.mappingsEditor.nestedMultifieldsDeprecatedCallOutTitle', {
      defaultMessage: 'Chained multi-fields are deprecated',
    })}
    iconType="alert"
    color="warning"
    data-test-subj="nestedMultifieldsDeprecatedCallout"
  >
    <p>
      <FormattedMessage
        id="xpack.idxMgmt.mappingsEditor.nestedMultifieldsDeprecatedCallOutDescription"
        defaultMessage="Defining chained multi-fields was deprecated in 7.3 and is now no longer supported. Consider flattening the chained fields blocks into a single level, or switching to {copyTo} if appropriate."
        values={{
          copyTo: <EuiCode>copy_to</EuiCode>,
        }}
      />
    </p>
  </EuiCallOut>
);
