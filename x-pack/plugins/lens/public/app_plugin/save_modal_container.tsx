/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { ChromeStart, NotificationsStart } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { partition, uniq } from 'lodash';
import { SaveModal } from './save_modal';
import { LensAppProps, LensAppServices } from './types';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import type { SaveProps } from './app';
import { Document, injectFilterReferences } from '../persistence';
import { LensByReferenceInput, LensEmbeddableInput } from '../editor_frame_service/embeddable';
import { LensAttributeService } from '../lens_attribute_service';
import {
  DataPublicPluginStart,
  esFilters,
  IndexPattern,
} from '../../../../../src/plugins/data/public';
import { APP_ID, getFullPath, LENS_EMBEDDABLE_TYPE } from '../../common';
import { getAllIndexPatterns } from '../utils';
import { trackUiEvent } from '../lens_ui_telemetry';
import { checkForDuplicateTitle } from '../../../../../src/plugins/saved_objects/public';
import { LensAppState } from '../state_management';
import { LensPublicStart } from '../plugin';

type ExtraProps = Pick<LensAppProps, 'initialInput'> &
  Partial<
    Pick<LensAppProps, 'redirectToOrigin' | 'redirectTo' | 'redirectToDashboard' | 'onAppLeave'>
  >;

export type SaveModalContainerProps = {
  isVisible: boolean;
  originatingApp?: string;
  persistedDoc?: Document;
  lastKnownDoc?: Document;
  returnToOriginSwitchLabel?: string;
  onSave: (saveProps: SaveProps, options: { saveToLibrary: boolean }) => void;
  onClose: () => void;
  attributeService?: LensAttributeService;
  isSaveable?: boolean;
  getAppNameFromId?: () => string | undefined;
} & ExtraProps;

export function SaveModalContainer({
  returnToOriginSwitchLabel,
  onClose,
  onSave,
  isVisible,
  persistedDoc,
  originatingApp,
  initialInput,
  redirectTo,
  redirectToDashboard,
  redirectToOrigin,
  getAppNameFromId = () => undefined,
  isSaveable = true,
  attributeService: initAttributeService,
}: SaveModalContainerProps) {
  const [lastKnownDoc, setLastKnownDoc] = useState<Document>();
  const [attributeService, setAttributeService] = useState(initAttributeService);

  // Lens Public Start will be used when SaveModalContainer is used outside lens app to fetch
  // Attribute service
  const kServices = useKibana<LensAppServices & { lens: LensPublicStart }>().services;
  const {
    notifications,
    application,
    lens,
    data,
    chrome,
    dashboard,
    savedObjectsTagging,
    presentationUtil,
  } = kServices;

  if (!presentationUtil) {
    throw Error('presentationUtil is required as plugin dependency to use LensSavedModalLazy');
  }

  const { ContextProvider: PresentationUtilContext } = presentationUtil;

  useEffect(() => {
    if (initialInput !== null) {
      async function loadLastKnownDoc() {
        let attributeServiceT: LensAttributeService;
        if (!initAttributeService && lens?.attributeService) {
          attributeServiceT = await lens.attributeService();
          setAttributeService(attributeServiceT);

          getLastKnownDoc({
            data,
            initialInput,
            chrome,
            notifications,
            attributeService: attributeServiceT,
          }).then((result) => {
            if (result) setLastKnownDoc(result.doc);
          });
        } else {
          getLastKnownDoc({
            data,
            initialInput,
            chrome,
            notifications,
            attributeService: initAttributeService!,
          }).then((result) => {
            if (result) setLastKnownDoc(result.doc);
          });
        }
      }

      loadLastKnownDoc();
    }
  }, [chrome, data, lens, initialInput, notifications, initAttributeService]);

  const tagsIds =
    persistedDoc && savedObjectsTagging
      ? savedObjectsTagging.ui.getTagIdsFromReferences(persistedDoc.references)
      : [];

  const runSave = (saveProps: SaveProps, options: { saveToLibrary: boolean }) => {
    if (onSave) {
      onSave(saveProps, options);
    } else {
      if (attributeService) {
        runSaveLensVisualization(
          {
            ...kServices,
            lastKnownDoc,
            setIsSaveModalVisible: () => {
              onClose();
            },
            initialInput,
            attributeService,
            redirectTo,
            redirectToDashboard,
            redirectToOrigin,
            getIsByValueMode: () => false,
            onAppLeave: () => {},
          },
          saveProps,
          options
        ).then(() => {
          onClose();
        });
      }
    }
  };

  const savingToLibraryPermitted = Boolean(isSaveable && application.capabilities.visualize.save);

  return (
    <PresentationUtilContext>
      <SaveModal
        isVisible={isVisible}
        originatingApp={originatingApp}
        savingToLibraryPermitted={savingToLibraryPermitted}
        allowByValueEmbeddables={dashboard.dashboardFeatureFlagConfig?.allowByValueEmbeddables}
        savedObjectsTagging={savedObjectsTagging}
        tagsIds={tagsIds}
        onSave={(saveProps, options) => {
          runSave(saveProps, options);
        }}
        onClose={onClose}
        getAppNameFromId={getAppNameFromId}
        lastKnownDoc={lastKnownDoc}
        returnToOriginSwitchLabel={returnToOriginSwitchLabel}
      />
    </PresentationUtilContext>
  );
}

export const runSaveLensVisualization = async (
  props: {
    lastKnownDoc?: Document;
    getIsByValueMode: () => boolean;
    persistedDoc?: Document;
    setIsSaveModalVisible: () => void;
  } & ExtraProps &
    LensAppServices,
  saveProps: SaveProps,
  options: { saveToLibrary: boolean }
) => {
  return new Promise<Partial<LensAppState>>(async (resolve, reject) => {
    const {
      chrome,
      initialInput,
      lastKnownDoc,
      persistedDoc,
      savedObjectsClient,
      overlays,
      notifications,
      stateTransfer,
      attributeService,
      savedObjectsTagging,
      redirectToDashboard,
      getIsByValueMode,
      redirectToOrigin,
      onAppLeave,
      setIsSaveModalVisible,
      redirectTo,
    } = props;
    if (!lastKnownDoc) {
      return;
    }

    const tagsIds =
      persistedDoc && savedObjectsTagging
        ? savedObjectsTagging.ui.getTagIdsFromReferences(persistedDoc.references)
        : [];

    let references = lastKnownDoc.references;
    if (savedObjectsTagging) {
      references = savedObjectsTagging.ui.updateTagsReferences(
        references,
        saveProps.newTags || tagsIds
      );
    }

    const docToSave = {
      ...getLastKnownDocWithoutPinnedFilters(lastKnownDoc)!,
      description: saveProps.newDescription,
      title: saveProps.newTitle,
      references,
    };

    // Required to serialize filters in by value mode until
    // https://github.com/elastic/kibana/issues/77588 is fixed
    if (getIsByValueMode()) {
      docToSave.state.filters.forEach((filter) => {
        if (typeof filter.meta.value === 'function') {
          delete filter.meta.value;
        }
      });
    }

    const originalInput = saveProps.newCopyOnSave ? undefined : initialInput;
    const originalSavedObjectId = (originalInput as LensByReferenceInput)?.savedObjectId;
    if (options.saveToLibrary) {
      try {
        await checkForDuplicateTitle(
          {
            id: originalSavedObjectId,
            title: docToSave.title,
            copyOnSave: saveProps.newCopyOnSave,
            lastSavedTitle: lastKnownDoc.title,
            getEsType: () => 'lens',
            getDisplayName: () =>
              i18n.translate('xpack.lens.app.saveModalType', {
                defaultMessage: 'Lens visualization',
              }),
          },
          saveProps.isTitleDuplicateConfirmed,
          saveProps.onTitleDuplicate,
          {
            savedObjectsClient,
            overlays,
          }
        );
      } catch (e) {
        // ignore duplicate title failure, user notified in save modal
        return;
      }
    }
    try {
      const newInput = (await attributeService.wrapAttributes(
        docToSave,
        options.saveToLibrary,
        originalInput
      )) as LensEmbeddableInput;

      if (saveProps.returnToOrigin && redirectToOrigin) {
        // disabling the validation on app leave because the document has been saved.
        onAppLeave?.((actions) => {
          return actions.default();
        });
        redirectToOrigin({ input: newInput, isCopied: saveProps.newCopyOnSave });
        return;
      } else if (saveProps.dashboardId && redirectToDashboard) {
        // disabling the validation on app leave because the document has been saved.
        onAppLeave?.((actions) => {
          return actions.default();
        });
        redirectToDashboard(newInput, saveProps.dashboardId);
        return;
      }

      notifications.toasts.addSuccess(
        i18n.translate('xpack.lens.app.saveVisualization.successNotificationText', {
          defaultMessage: `Saved '{visTitle}'`,
          values: {
            visTitle: docToSave.title,
          },
        })
      );

      if (
        attributeService.inputIsRefType(newInput) &&
        newInput.savedObjectId !== originalSavedObjectId
      ) {
        chrome.recentlyAccessed.add(
          getFullPath(newInput.savedObjectId),
          docToSave.title,
          newInput.savedObjectId
        );

        setIsSaveModalVisible();
        // remove editor state so the connection is still broken after reload
        stateTransfer.clearEditorState(APP_ID);

        redirectTo?.(newInput.savedObjectId);
        resolve({ isLinkedToOriginatingApp: false });
        return;
      }

      const newDoc = {
        ...docToSave,
        ...newInput,
      };

      resolve({ persistedDoc: newDoc, lastKnownDoc: newDoc, isLinkedToOriginatingApp: false });

      setIsSaveModalVisible();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.dir(e);
      trackUiEvent('save_failed');
      setIsSaveModalVisible();
    }
  });
};

export function getLastKnownDocWithoutPinnedFilters(doc?: Document) {
  if (!doc) return undefined;
  const [pinnedFilters, appFilters] = partition(
    injectFilterReferences(doc.state?.filters || [], doc.references),
    esFilters.isFilterPinned
  );
  return pinnedFilters?.length
    ? {
        ...doc,
        state: {
          ...doc.state,
          filters: appFilters,
        },
      }
    : doc;
}

export const getLastKnownDoc = async ({
  initialInput,
  attributeService,
  data,
  persistedDoc,
  notifications,
  chrome,
}: {
  initialInput?: LensEmbeddableInput;
  attributeService: LensAttributeService;
  persistedDoc?: Document;
  data: DataPublicPluginStart;
  notifications: NotificationsStart;
  chrome: ChromeStart;
}) => {
  if (!initialInput) {
    return;
  }
  return new Promise<{ doc: Document; indexPatterns: IndexPattern[] }>((resolve, reject) => {
    attributeService
      .unwrapAttributes(initialInput)
      .then((attributes) => {
        const doc = {
          ...initialInput,
          ...attributes,
          type: LENS_EMBEDDABLE_TYPE,
        };

        if (attributeService.inputIsRefType(initialInput)) {
          chrome.recentlyAccessed.add(
            getFullPath(initialInput.savedObjectId),
            attributes.title,
            initialInput.savedObjectId
          );
        }
        const indexPatternIds = uniq(
          doc.references.filter(({ type }) => type === 'index-pattern').map(({ id }) => id)
        );
        getAllIndexPatterns(indexPatternIds, data.indexPatterns)
          .then(({ indexPatterns }) => {
            // Don't overwrite any pinned filters
            data.query.filterManager.setAppFilters(
              injectFilterReferences(doc.state.filters, doc.references)
            );
            resolve({
              doc,
              indexPatterns,
            });
          })
          .catch((e) => {
            reject();
          });
      })
      .catch((e) => {
        notifications.toasts.addDanger(
          i18n.translate('xpack.lens.app.docLoadingError', {
            defaultMessage: 'Error loading saved document',
          })
        );
        reject();
      });
  });
};

// eslint-disable-next-line import/no-default-export
export default SaveModalContainer;
