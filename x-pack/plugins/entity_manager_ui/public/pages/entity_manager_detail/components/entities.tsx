/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EntityDefinitionWithState } from '@kbn/entities-schema';
import { EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { EntitiesListing } from '../../../components/entities_listing';

interface EntitiesListingProps {
  definition?: EntityDefinitionWithState;
}

export function Entities({ definition }: EntitiesListingProps) {
  return (
    <EuiPanel hasBorder>
      <EuiTitle size="s">
        <h2>
          {i18n.translate('xpack.entityManager.entitiesListing.h2.entitiesLabel', {
            defaultMessage: 'Entities',
          })}
        </h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EntitiesListing definition={definition} />
    </EuiPanel>
  );
}
