/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { ChromeStart, NotificationsStart } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { METRIC_TYPE } from '@kbn/analytics';
import { partition } from 'lodash';
import { SaveModal } from './save_modal';
import { LensAppProps, LensAppServices } from './types';
import type { SaveProps } from './app';
import { Document, injectFilterReferences } from '../persistence';
import { LensByReferenceInput, LensEmbeddableInput } from '../embeddable';
import { LensAttributeService } from '../lens_attribute_service';
import { DataPublicPluginStart, esFilters } from '../../../../../src/plugins/data/public';
import { APP_ID, getFullPath, LENS_EMBEDDABLE_TYPE } from '../../common';
import { trackUiEvent } from '../lens_ui_telemetry';
import { checkForDuplicateTitle } from '../../../../../src/plugins/saved_objects/public';
import { LensAppState } from '../state_management';

type ExtraProps = Pick<LensAppProps, 'initialInput'> &
  Partial<Pick<LensAppProps, 'redirectToOrigin' | 'redirectTo' | 'onAppLeave'>>;

export type SaveModalContainerProps = {
  originatingApp?: string;
  persistedDoc?: Document;
  lastKnownDoc?: Document;
  returnToOriginSwitchLabel?: string;
  onClose: () => void;
  onSave?: () => void;
  runSave?: (saveProps: SaveProps, options: { saveToLibrary: boolean }) => void;
  isSaveable?: boolean;
  getAppNameFromId?: () => string | undefined;
  lensServices: LensAppServices;
} & ExtraProps;

export function SaveModalContainer({
  returnToOriginSwitchLabel,
  onClose,
  onSave,
  runSave,
  persistedDoc,
  originatingApp,
  initialInput,
  redirectTo,
  redirectToOrigin,
  getAppNameFromId = () => undefined,
  isSaveable = true,
  lastKnownDoc: initLastKnowDoc,
  lensServices,
}: SaveModalContainerProps) {
  const [lastKnownDoc, setLastKnownDoc] = useState<Document | undefined>(initLastKnowDoc);
  let title = '';
  let description;
  let savedObjectId;
  if (lastKnownDoc) {
    title = lastKnownDoc.title;
    description = lastKnownDoc.description;
    savedObjectId = lastKnownDoc.savedObjectId;
  }

  const {
    attributeService,
    notifications,
    data,
    chrome,
    savedObjectsTagging,
    application,
    dashboardFeatureFlag,
  } = lensServices;

  useEffect(() => {
    setLastKnownDoc(initLastKnowDoc);
  }, [initLastKnowDoc]);

  useEffect(() => {
    let isMounted = true;
    async function loadPersistedDoc() {
      if (initialInput) {
        getPersistedDoc({
          data,
          initialInput,
          chrome,
          notifications,
          attributeService,
        }).then((doc) => {
          if (doc && isMounted) setLastKnownDoc(doc);
        });
      }
    }

    loadPersistedDoc();
    return () => {
      isMounted = false;
    };
  }, [chrome, data, initialInput, notifications, attributeService]);

  const tagsIds =
    persistedDoc && savedObjectsTagging
      ? savedObjectsTagging.ui.getTagIdsFromReferences(persistedDoc.references)
      : [];

  const runLensSave = (saveProps: SaveProps, options: { saveToLibrary: boolean }) => {
    if (runSave) {
      // inside lens, we use the function that's passed to it
      runSave(saveProps, options);
    } else {
      if (attributeService && lastKnownDoc) {
        runSaveLensVisualization(
          {
            ...lensServices,
            lastKnownDoc,
            initialInput,
            attributeService,
            redirectTo,
            redirectToOrigin,
            originatingApp,
            getIsByValueMode: () => false,
            onAppLeave: () => {},
          },
          saveProps,
          options
        ).then(() => {
          onSave?.();
          onClose();
        });
      }
    }
  };

  const savingToLibraryPermitted = Boolean(isSaveable && application.capabilities.visualize.save);

  return (
    <SaveModal
      originatingApp={originatingApp}
      savingToLibraryPermitted={savingToLibraryPermitted}
      allowByValueEmbeddables={dashboardFeatureFlag?.allowByValueEmbeddables}
      savedObjectsTagging={savedObjectsTagging}
      tagsIds={tagsIds}
      onSave={(saveProps, options) => {
        runLensSave(saveProps, options);
      }}
      onClose={onClose}
      getAppNameFromId={getAppNameFromId}
      title={title}
      description={description}
      savedObjectId={savedObjectId}
      returnToOriginSwitchLabel={returnToOriginSwitchLabel}
    />
  );
}

const redirectToDashboard = ({
  embeddableInput,
  dashboardFeatureFlag,
  dashboardId,
  stateTransfer,
}: {
  embeddableInput: LensEmbeddableInput;
  dashboardId: string;
  dashboardFeatureFlag: LensAppServices['dashboardFeatureFlag'];
  stateTransfer: LensAppServices['stateTransfer'];
}) => {
  if (!dashboardFeatureFlag.allowByValueEmbeddables) {
    throw new Error('redirectToDashboard called with by-value embeddables disabled');
  }

  const state = {
    input: embeddableInput,
    type: LENS_EMBEDDABLE_TYPE,
  };

  const path = dashboardId === 'new' ? '#/create' : `#/view/${dashboardId}`;
  stateTransfer.navigateToWithEmbeddablePackage('dashboards', {
    state,
    path,
  });
};

export const runSaveLensVisualization = async (
  props: {
    lastKnownDoc?: Document;
    getIsByValueMode: () => boolean;
    persistedDoc?: Document;
    originatingApp?: string;
  } & ExtraProps &
    LensAppServices,
  saveProps: SaveProps,
  options: { saveToLibrary: boolean }
): Promise<Partial<LensAppState> | undefined> => {
  if (!props.lastKnownDoc) {
    return;
  }

  const {
    chrome,
    initialInput,
    originatingApp,
    lastKnownDoc,
    persistedDoc,
    savedObjectsClient,
    overlays,
    notifications,
    stateTransfer,
    attributeService,
    usageCollection,
    savedObjectsTagging,
    getIsByValueMode,
    redirectToOrigin,
    onAppLeave,
    redirectTo,
    dashboardFeatureFlag,
  } = props;

  const tagsIds =
    persistedDoc && savedObjectsTagging
      ? savedObjectsTagging.ui.getTagIdsFromReferences(persistedDoc.references)
      : [];
  if (usageCollection) {
    usageCollection.reportUiCounter(originatingApp || 'visualize', METRIC_TYPE.CLICK, 'lens:save');
  }

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
      throw e;
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
    } else if (saveProps.dashboardId) {
      // disabling the validation on app leave because the document has been saved.
      onAppLeave?.((actions) => {
        return actions.default();
      });
      redirectToDashboard({
        embeddableInput: newInput,
        dashboardId: saveProps.dashboardId,
        stateTransfer,
        dashboardFeatureFlag,
      });
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

      // remove editor state so the connection is still broken after reload
      stateTransfer.clearEditorState?.(APP_ID);

      redirectTo?.(newInput.savedObjectId);
      return { isLinkedToOriginatingApp: false };
    }

    const newDoc = {
      ...docToSave,
      ...newInput,
    };

    return {
      persistedDoc: newDoc,
      isLinkedToOriginatingApp: false,
    };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.dir(e);
    trackUiEvent('save_failed');
    throw e;
  }
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

export const getPersistedDoc = async ({
  initialInput,
  attributeService,
  data,
  notifications,
  chrome,
}: {
  initialInput: LensEmbeddableInput;
  attributeService: LensAttributeService;
  data: DataPublicPluginStart;
  notifications: NotificationsStart;
  chrome: ChromeStart;
}): Promise<Document | undefined> => {
  let doc: Document;

  try {
    const attributes = await attributeService.unwrapAttributes(initialInput);

    doc = {
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

    // Don't overwrite any pinned filters
    data.query.filterManager.setAppFilters(
      injectFilterReferences(doc.state.filters, doc.references)
    );
    return doc;
  } catch (e) {
    notifications.toasts.addDanger(
      i18n.translate('xpack.lens.app.docLoadingError', {
        defaultMessage: 'Error loading saved document',
      })
    );
  }
};

// eslint-disable-next-line import/no-default-export
export default SaveModalContainer;
