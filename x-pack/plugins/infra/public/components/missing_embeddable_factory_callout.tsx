/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const MissingEmbeddableFactoryCallout: React.FC<{ embeddableType: string }> = ({
  embeddableType,
}) => {
  return (
    <EuiCallOut
      size="s"
      color="warning"
      title={i18n.translate('xpack.infra.missingEmebeddableFactoryCallout', {
        defaultMessage:
          "{embeddableType} embeddable is unavailable. This can happen if the embeddable plugin isn't enabled.",
        values: { embeddableType },
      })}
    />
  );
};
