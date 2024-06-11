/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { OverlayRef } from '@kbn/core/public';
import { openAddPanelFlyout } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import type { InvestigateWidgetCreate } from '@kbn/investigate-plugin/public';
import type { PresentationContainer } from '@kbn/presentation-containers';
import type { FinderAttributes } from '@kbn/saved-objects-finder-plugin/common';
import React, { useMemo, useRef } from 'react';
import { BehaviorSubject } from 'rxjs';
import { createEmbeddableWidget } from '../../widgets/embeddable_widget/create_embeddable_widget';
import { InvestigateTextButton } from '../investigate_text_button';

interface AddFromLibraryButtonProps {
  onWidgetAdd: (widget: InvestigateWidgetCreate) => Promise<void>;
}

export function AddFromLibraryButton({ onWidgetAdd }: AddFromLibraryButtonProps) {
  const children$ = useMemo(() => new BehaviorSubject({}), []);

  const onWidgetAddRef = useRef(onWidgetAdd);

  onWidgetAddRef.current = onWidgetAdd;

  const panelRef = useRef<OverlayRef>();

  const container = useMemo<
    PresentationContainer & {
      addNewEmbeddable: (
        type: string,
        explicitInput: { savedObjectId: string },
        attributes: FinderAttributes
      ) => Promise<{ id: undefined }>;
    }
  >(() => {
    return {
      addNewPanel: async (...args) => {
        throw new Error('addNewPanel not supported in this context');
      },
      removePanel: async (...args) => {
        throw new Error('removePanel not supported in this context');
      },
      replacePanel: async (...args) => {
        throw new Error('replacePanel not supported in this context');
      },
      getPanelCount() {
        return 0;
      },
      addNewEmbeddable: async (type, explicitInput, attributes) => {
        const widget = createEmbeddableWidget({
          title: attributes.title ?? '',
          description:
            'description' in attributes && typeof attributes.description === 'string'
              ? attributes.description
              : '',
          parameters: {
            savedObjectId: explicitInput.savedObjectId,
            config: attributes,
            type,
          },
        });

        onWidgetAddRef.current(widget).then(() => {
          if (panelRef.current) {
            panelRef.current.close();
          }
        });

        return undefined as any; // { id: undefined };
      },
      children$,
    };
  }, [children$]);

  return (
    <InvestigateTextButton
      iconType="importAction"
      onClick={() => {
        panelRef.current = openAddPanelFlyout({
          container,
        });

        panelRef.current.onClose.then(() => {
          panelRef.current = undefined;
        });
      }}
    >
      {i18n.translate('xpack.investigateApp.addFromLibraryButtonLabel', {
        defaultMessage: 'Import from library',
      })}
    </InvestigateTextButton>
  );
}
