/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiIcon, EuiIconProps } from '@elastic/eui';
import OsqueryLogo from './osquery.svg';

export type OsqueryIconProps = Omit<EuiIconProps, 'type'>;

const OsqueryIconComponent: React.FC<OsqueryIconProps> = (props) => {
  const [Icon, setIcon] = useState<React.ReactElement | null>(null);

  // FIXME: This is a hack to force the icon to be loaded asynchronously.
  useEffect(() => {
    const interval = setInterval(() => {
      setIcon(<EuiIcon size="xl" type={OsqueryLogo} {...props} />);
    }, 0);

    return () => clearInterval(interval);
  }, [props, setIcon]);

  return Icon;
};

export const OsqueryIcon = React.memo(OsqueryIconComponent);
