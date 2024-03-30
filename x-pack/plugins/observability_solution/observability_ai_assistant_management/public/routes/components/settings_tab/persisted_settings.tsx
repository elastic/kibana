/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { omit, isEmpty } from 'lodash';
import { EuiSpacer } from '@elastic/eui';
import { withSuspense } from '@kbn/shared-ux-utility';
import { FieldRowProvider } from '@kbn/management-settings-components-field-row';
import { UnsavedFieldChange } from '@kbn/management-settings-types';
import { BottomBarActions } from '@kbn/observability-shared-plugin/public';
import { i18n } from '@kbn/i18n';
import { getFieldDefinitions } from './get_field_definitions';
import { useAppContext } from '../../../hooks/use_app_context';

const LazyFieldRow = React.lazy(async () => ({
  default: (await import('@kbn/management-settings-components-field-row')).FieldRow,
}));

const FieldRow = withSuspense(LazyFieldRow);

export function PersistedSettings() {
  const { observabilityAIAssistant, uiSettings, docLinks, notifications, settings } =
    useAppContext();
  const [unsavedChanges, setUnsavedChanges] = useState<Record<string, UnsavedFieldChange>>({});
  const [isSaving, setIsSaving] = useState(false);

  async function onSave() {
    if (!isEmpty(unsavedChanges)) {
      try {
        setIsSaving(true);
        const promises = Object.entries(unsavedChanges).map(([key, { unsavedValue }]) => {
          return settings.client.set(key, unsavedValue);
        });
        await Promise.all(promises);

        window.location.reload();
      } finally {
        setIsSaving(false);
      }
    }
  }

  function onDiscardChanges() {
    setUnsavedChanges({});
  }

  const { connectors, loading: isLoadingConnectors } =
    observabilityAIAssistant.useGenAIConnectors();

  const fieldDefinitions = useMemo(
    () => getFieldDefinitions(connectors, isLoadingConnectors, uiSettings),
    [connectors, isLoadingConnectors, uiSettings]
  );

  return (
    <>
      <EuiSpacer />

      {Object.values(fieldDefinitions).map((field) => {
        return (
          <FieldRowProvider
            key={field.id}
            {...{
              links: docLinks.links.management,
              showDanger: (message: string) => notifications.toasts.addDanger(message),
              validateChange: async (key: string, value: any) => {
                return { successfulValidation: true };
              },
            }}
          >
            <FieldRow
              field={field}
              isSavingEnabled={field.isSavingEnabled ?? true}
              unsavedChange={unsavedChanges[field.id]}
              onFieldChange={(id, change) => {
                if (!change) {
                  setUnsavedChanges((changes) => omit(changes, id));
                  return;
                }

                setUnsavedChanges((changes) => ({ ...changes, [id]: change }));
              }}
            />
          </FieldRowProvider>
        );
      })}
      {!isEmpty(unsavedChanges) && (
        <BottomBarActions
          isLoading={isSaving}
          onDiscardChanges={onDiscardChanges}
          onSave={onSave}
          saveLabel={i18n.translate(
            'xpack.observabilityAiAssistantManagement.persistedSettings.saveChangesLabel',
            { defaultMessage: 'Save changes' }
          )}
          unsavedChangesCount={Object.keys(unsavedChanges).length}
          appTestSubj="apm"
          areChangesInvalid={false}
        />
      )}
    </>
  );
}
