/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { KibanaLink } from './KibanaLink';

export function SetupInstructionsLink({
  buttonFill = false
}: {
  buttonFill?: boolean;
}) {
  const Button = buttonFill ? EuiButton : EuiButtonEmpty;
  return (
    <KibanaLink path={'/home/tutorial/apm'}>
      <Button size="s" color="primary" fill={buttonFill} iconType="help">
        {i18n.translate('xpack.apm.setupInstructionsButtonLabel', {
          defaultMessage: 'Setup Instructions'
        })}
      </Button>
    </KibanaLink>
  );
}
