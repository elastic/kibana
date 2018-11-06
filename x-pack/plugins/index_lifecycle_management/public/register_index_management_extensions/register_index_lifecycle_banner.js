/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { addBannerExtension } from '../../../index_management/public/index_management_extensions';
import { IndexLifecycleBanner } from '../components/index_lifecycle_banner';
addBannerExtension((indices) =>{
  if (!indices.length) {
    return null;
  }
  const indicesWithLifecycleErrors = indices.filter((index) => {
    return index.ilm && index.ilm.failed_step;
  });
  if (!indicesWithLifecycleErrors.length) {
    return null;
  }
  return <IndexLifecycleBanner indices={indicesWithLifecycleErrors} />;
});