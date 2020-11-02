/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiHeaderLink, EuiHeaderLinks } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ApplicationStart, IBasePath } from '../../../../../src/core/public';
import { RedirectAppLinks } from '../../../../../src/plugins/kibana_react/public';

interface ActionMenuProps {
  application: ApplicationStart;
  prepend: IBasePath['prepend'];
}

export function ActionMenu({ application, prepend }: ActionMenuProps) {
  return (
    <RedirectAppLinks application={application}>
      <EuiHeaderLinks>
        <EuiHeaderLink
          color="primary"
          href={prepend('/app/home#/tutorial_directory/logging')}
          iconType="indexOpen"
        >
          {i18n.translate('xpack.observability.home.addData', { defaultMessage: 'Add data' })}
        </EuiHeaderLink>
      </EuiHeaderLinks>
    </RedirectAppLinks>
  );
}
