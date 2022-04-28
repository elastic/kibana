/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiButtonProps } from '@elastic/eui';
import { useKibana, useRouterNavigate } from '../common/lib/kibana';

interface AddPackButtonComponentProps {
  fill?: EuiButtonProps['fill'];
}

const AddPackButtonComponent: React.FC<AddPackButtonComponentProps> = ({ fill = true }) => {
  const permissions = useKibana().services.application.capabilities.osquery;
  const newQueryLinkProps = useRouterNavigate('packs/add');

  return (
    <EuiButton
      fill={!!fill}
      {...newQueryLinkProps}
      iconType="plusInCircle"
      isDisabled={!permissions.writePacks}
    >
      <FormattedMessage id="xpack.osquery.packList.addPackButtonLabel" defaultMessage="Add pack" />
    </EuiButton>
  );
};

export const AddPackButton = React.memo(AddPackButtonComponent);
