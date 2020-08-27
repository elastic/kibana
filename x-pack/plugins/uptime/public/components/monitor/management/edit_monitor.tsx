/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';

import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDispatch } from 'react-redux';
import { createManagedMonitor } from '../../../state/actions/central_management';

interface EditMonitorComponentProps {
  onClick: () => void;
}

export const EditMonitor: React.FC = () => {
  const dispatch = useDispatch();

  return <EditMonitorComponent onClick={() => dispatch(createManagedMonitor())} />;
};

export const EditMonitorComponent: React.FC<EditMonitorComponentProps> = ({
  onClick,
}: EditMonitorComponentProps) => {
  const [isCentrallyManaged, setIsCentrallyManaged] = useState<boolean>(true);
  // TODO: translate
  const button = (
    <EuiButtonEmpty isDisabled={!isCentrallyManaged} onClick={onClick}>
      Edit monitor
    </EuiButtonEmpty>
  );
  return isCentrallyManaged ? (
    button
  ) : (
    <EuiToolTip
      content={i18n.translate('xpack.uptime.editMonitor.onPremToolTip', {
        defaultMessage: 'This monitor is not centrally-managed.',
      })}
    >
      {button}
    </EuiToolTip>
  );
};
