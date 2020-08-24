/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useMemo } from 'react';
import { useManageSource } from './index';

export const withSourcerer = (BaseComponent: JSX.Element) => (props: unknown) => {
  const { activeSourceGroupId, getManageSourceGroupById } = useManageSource();
  const { indexPatterns } = useMemo(() => getManageSourceGroupById(activeSourceGroupId), [
    getManageSourceGroupById,
    activeSourceGroupId,
  ]);
  return <BaseComponent {...props} sourcererIndexPatterns={indexPatterns} />;
};
