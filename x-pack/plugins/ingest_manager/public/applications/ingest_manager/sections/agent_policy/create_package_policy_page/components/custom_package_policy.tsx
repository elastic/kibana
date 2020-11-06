/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo } from 'react';
import { useUIExtension } from '../../../../hooks/use_ui_extension';
import { ExtensionWrapper } from '../../../../components/extension_wrapper';

export const CustomPackagePolicy = memo((props) => {
  const ExtensionView = useUIExtension(
    props.packageName,
    'integration-policy',
    props.from === 'edit' ? 'edit' : 'create'
  );

  return ExtensionView ? (
    <ExtensionWrapper>
      <ExtensionView {...props} />
    </ExtensionWrapper>
  ) : null;
});
