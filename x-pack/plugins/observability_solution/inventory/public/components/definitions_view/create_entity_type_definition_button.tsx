/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton } from '@elastic/eui';
import { EntityTypeDefinition } from '../../../common/entities';
import { EntityDefinitionFormFlyout } from '../entity_definition_form_flyout';

const emptyDefinition: Partial<Required<EntityTypeDefinition>['discoveryDefinition']> = {};

export function CreateEntityTypeDefinitionButton({
  onSubmit,
}: {
  onSubmit: (definition: Required<EntityTypeDefinition>['discoveryDefinition']) => Promise<void>;
}) {
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);

  return (
    <>
      {isFlyoutOpen ? (
        <EntityDefinitionFormFlyout
          definition={emptyDefinition}
          onClose={() => {
            setIsFlyoutOpen(false);
          }}
          onSubmit={onSubmit}
        />
      ) : null}
      <EuiButton
        data-test-subj="createEntityTypeDefinitionButton"
        fill
        onClick={() => {
          setIsFlyoutOpen(true);
        }}
        iconType="plusInCircleFilled"
      >
        {i18n.translate(
          'xpack.inventory.createEntityTypeDefinitionButton.newDefinitionButtonLabel',
          { defaultMessage: 'Add entity type' }
        )}
      </EuiButton>
    </>
  );
}
