/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OverlayRef } from '@kbn/core/public';
import { v4 } from 'uuid';
import { openAddPanelFlyout } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import type { PresentationContainer } from '@kbn/presentation-containers';
import type { FinderAttributes } from '@kbn/saved-objects-finder-plugin/common';
import React, { useMemo, useRef } from 'react';
import { BehaviorSubject } from 'rxjs';
import { useKibana } from '../../../../hooks/use_kibana';
import { InvestigateTextButton } from '../investigate_text_button';

// interface AddFromLibraryButtonProps {
//   onWidgetAdd: (widget: InvestigateWidgetCreate) => Promise<void>;
// }

export function AddFromLibraryButton({ onWidgetAdd }) {
  const children$ = useMemo(() => new BehaviorSubject({}), []);

  const {
    dependencies: {
      start: { contentManagement },
    },
  } = useKibana();

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
    function addEmbeddable({
      type,
      title,
      description,
      attributes,
      savedObjectId,
    }: {
      type: string;
      title: string;
      description?: string;
      attributes: Record<string, any>;
      savedObjectId: string;
    }) {
      const widget = {
        // id: v4(),
        title,
        type: 'embeddable',
        params: {
          savedObjectId,
          config: attributes,
          type,
        },
      };

      onWidgetAddRef.current(widget).then(() => {
        if (panelRef.current) {
          panelRef.current.close();
        }
      });
    }
    return {
      addNewPanel: async (panel, displaySuccessMessage) => {
        const state = panel.initialState! as {
          savedObjectId: string;
        };

        const savedObject = (await contentManagement.client.get({
          contentTypeId: panel.panelType,
          id: state.savedObjectId,
        })) as { item: { attributes: { title: string } } };
        addEmbeddable({
          type: panel.panelType,

          savedObjectId: state.savedObjectId,
          attributes: {},
          description: '',

          title: savedObject.item.attributes.title,
        });

        return undefined as any;
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
        addEmbeddable({
          type,
          title: attributes.title ?? '',
          description:
            'description' in attributes && typeof attributes.description === 'string'
              ? attributes.description
              : '',
          savedObjectId: explicitInput.savedObjectId,
          attributes,
        });
        return v4();
      },
      children$,
    };
  }, [children$, contentManagement]);

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
