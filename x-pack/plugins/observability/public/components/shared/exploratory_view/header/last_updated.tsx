/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiIcon, EuiText } from '@elastic/eui';
import moment from 'moment';

interface Props {
  lastUpdated?: number;
}
export function LastUpdated({ lastUpdated }: Props) {
  const [refresh, setRefresh] = useState(() => Date.now());

  useEffect(() => {
    const interVal = setInterval(() => {
      setRefresh(Date.now());
    }, 5000);

    return () => {
      clearInterval(interVal);
    };
  }, []);

  useEffect(() => {
    setRefresh(Date.now());
  }, [lastUpdated]);

  if (!lastUpdated) {
    return null;
  }

  const isWarning = moment().diff(moment(lastUpdated), 'minute') > 5;
  const isDanger = moment().diff(moment(lastUpdated), 'minute') > 10;

  return (
    <EuiText color={isDanger ? 'danger' : isWarning ? 'warning' : 'subdued'} size="s">
      <EuiIcon type="clock" /> Last Updated: {moment(lastUpdated).from(refresh)}
    </EuiText>
  );
}
