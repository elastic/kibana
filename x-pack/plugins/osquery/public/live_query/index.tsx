/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { LiveQueryForm } from './form';

interface LiveQueryProps {
  onSuccess?: () => void;
}

const LiveQueryComponent: React.FC<LiveQueryProps> = ({ onSuccess }) => {
  return <LiveQueryForm onSuccess={onSuccess} />;
};

export const LiveQuery = React.memo(LiveQueryComponent);
