/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactElement } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiToolTip } from '@elastic/eui';

interface Props {
  isManagedRepository?: boolean;
  component: ReactElement;
}

export const DisableToolTip: React.FunctionComponent<Props> = ({
  isManagedRepository,
  component,
}) => {
  return isManagedRepository ? (
    <EuiToolTip
      content={i18n.translate('xpack.snapshotRestore.repositoryForm.disableToolTipContent', {
        defaultMessage: 'This field is disabled because you are editing a managed repository.',
      })}
      display="block"
    >
      {component}
    </EuiToolTip>
  ) : (
    component
  );
};
