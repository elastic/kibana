/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { isFilterPinned } from '@kbn/es-query';
import { VisualizeFieldContext } from '@kbn/ui-actions-plugin/public';
import type { SavedObjectReference } from '@kbn/core/public';
import { EuiLoadingSpinner } from '@elastic/eui';
import { omit } from 'lodash';
import { SaveModal } from './save_modal';
import type { LensAppProps, LensAppServices } from './types';
import type { SaveProps } from './app';
import { checkForDuplicateTitle, SavedObjectIndexStore, LensDocument } from '../persistence';
import type { LensByReferenceInput } from '../embeddable';
import { APP_ID, getFullPath } from '../../common/constants';
import type { LensAppState } from '../state_management';
import { getFromPreloaded } from '../state_management/init_middleware/load_initial';
import { Simplify, VisualizeEditorContext } from '../types';
import { redirectToDashboard } from './save_modal_container_helpers';
import { LensSerializedState } from '../react_embeddable/types';

type ExtraProps = Simplify<
  Pick<LensAppProps, 'initialInput'> &
    Partial<Pick<LensAppProps, 'redirectToOrigin' | 'redirectTo' | 'onAppLeave'>>
>;

export type SaveModalContainerProps = {
  originatingApp?: string;
  getOriginatingPath?: (dashboardId: string) => string;
  persistedDoc?: LensDocument;
  lastKnownDoc?: LensDocument;
  returnToOriginSwitchLabel?: string;
  onClose: () => void;
  onSave?: (saveProps: SaveProps) => void;
  runSave?: (saveProps: SaveProps, options: { saveToLibrary: boolean }) => void;
  isSaveable?: boolean;
  getAppNameFromId?: () => string | undefined;
  lensServices: Pick<
    LensAppServices,
    | 'attributeService'
    | 'savedObjectsTagging'
    | 'application'
    | 'notifications'
    | 'http'
    | 'chrome'
    | 'overlays'
    | 'analytics'
    | 'i18n'
    | 'theme'
    | 'stateTransfer'
    | 'savedObjectStore'
  >;
  initialContext?: VisualizeFieldContext | VisualizeEditorContext;
  // is this visualization managed by the system?
  managed?: boolean;
} & ExtraProps;

export function SaveModalContainer({
  returnToOriginSwitchLabel,
  onClose,
  onSave,
  runSave,
  persistedDoc,
  originatingApp,
  getOriginatingPath,
  initialInput,
  redirectTo,
  redirectToOrigin,
  getAppNameFromId = () => undefined,
  isSaveable = true,
  lastKnownDoc: initLastKnownDoc,
  lensServices,
  initialContext,
  managed,
}: SaveModalContainerProps) {
  let title = '';
  let description;
  let savedObjectId;
  const [initializing, setInitializing] = useState(true);
  const [lastKnownDoc, setLastKnownDoc] = useState<LensDocument | undefined>(initLastKnownDoc);
  if (lastKnownDoc) {
    title = lastKnownDoc.title;
    description = lastKnownDoc.description;
    savedObjectId = lastKnownDoc.savedObjectId;
  }

  if (
    !lastKnownDoc?.title &&
    initialContext &&
    'isEmbeddable' in initialContext &&
    initialContext.isEmbeddable
  ) {
    title = i18n.translate('xpack.lens.app.convertedLabel', {
      defaultMessage: '{title} (converted)',
      values: {
        title: initialContext.title || `${initialContext.visTypeTitle} visualization`,
      },
    });
  }

  const { attributeService, savedObjectsTagging, application } = lensServices;

  useEffect(() => {
    setLastKnownDoc(initLastKnownDoc);
  }, [initLastKnownDoc]);

  useEffect(() => {
    let isMounted = true;

    if (initialInput) {
      getFromPreloaded({
        initialInput,
        lensServices,
      })
        .then((persisted) => {
          if (persisted?.doc && isMounted) setLastKnownDoc(persisted.doc);
        })
        .finally(() => {
          setInitializing(false);
        });
    } else {
      setInitializing(false);
    }

    return () => {
      isMounted = false;
    };
  }, [initialInput, lensServices]);

  const tagsIds =
    persistedDoc && savedObjectsTagging
      ? savedObjectsTagging.ui.getTagIdsFromReferences(persistedDoc.references)
      : [];

  const runLensSave = (saveProps: SaveProps, options: { saveToLibrary: boolean }) => {
    if (runSave) {
      // inside lens, we use the function that's passed to it
      runSave(saveProps, options);
    } else if (attributeService && lastKnownDoc) {
      runSaveLensVisualization(
        {
          ...lensServices,
          lastKnownDoc,
          initialInput,
          redirectTo,
          redirectToOrigin,
          originatingApp,
          getOriginatingPath,
          getIsByValueMode: () => false,
          onAppLeave: () => {},
          ...lensServices,
        },
        saveProps,
        options
      ).then(() => {
        onSave?.(saveProps);
        onClose();
      });
    }
  };

  if (initializing) {
    return <EuiLoadingSpinner />;
  }

  const savingToLibraryPermitted = Boolean(isSaveable && application.capabilities.visualize.save);

  return (
    <SaveModal
      originatingApp={originatingApp}
      getOriginatingPath={getOriginatingPath}
      savingToLibraryPermitted={savingToLibraryPermitted}
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
      returnToOrigin={redirectToOrigin != null}
      managed={Boolean(managed)}
    />
  );
}

function fromDocumentToSerializedState(
  doc: LensDocument,
  panelSettings: Partial<LensSerializedState>
): LensSerializedState {
  return {
    attributes: omit(doc, 'savedObjectId'),
    savedObjectId: doc.savedObjectId,
    ...panelSettings,
  };
}

const getDocToSave = (
  lastKnownDoc: LensDocument,
  saveProps: SaveProps,
  references: SavedObjectReference[]
): LensDocument => {
  const docToSave = {
    ...removePinnedFilters(lastKnownDoc)!,
    references,
  };

  if (saveProps.newDescription !== undefined) {
    docToSave.description = saveProps.newDescription;
  }

  if (saveProps.newTitle !== undefined) {
    docToSave.title = saveProps.newTitle;
  }

  return docToSave;
};

type SaveVisualizationProps = Simplify<
  {
    lastKnownDoc?: LensDocument;
    getIsByValueMode: () => boolean;
    persistedDoc?: LensDocument;
    originatingApp?: string;
    getOriginatingPath?: (dashboardId: string) => string;
    textBasedLanguageSave?: boolean;
    switchDatasource?: () => void;
    savedObjectStore: SavedObjectIndexStore;
  } & ExtraProps &
    Pick<
      LensAppServices,
      | 'application'
      | 'chrome'
      | 'overlays'
      | 'analytics'
      | 'i18n'
      | 'theme'
      | 'notifications'
      | 'stateTransfer'
      | 'attributeService'
      | 'savedObjectsTagging'
    >
>;

export const runSaveLensVisualization = async (
  props: SaveVisualizationProps,
  saveProps: SaveProps,
  options: { saveToLibrary: boolean }
): Promise<Partial<LensAppState> | undefined> => {
  const {
    chrome,
    initialInput,
    lastKnownDoc,
    persistedDoc,
    notifications,
    stateTransfer,
    attributeService,
    savedObjectsTagging,
    getIsByValueMode,
    redirectToOrigin,
    onAppLeave,
    redirectTo,
    textBasedLanguageSave,
    switchDatasource,
    application,
    savedObjectStore,
    getOriginatingPath,
    originatingApp,
    ...startServices
  } = props;

  if (!lastKnownDoc) {
    return;
  }

  let references = lastKnownDoc.references;

  if (savedObjectsTagging) {
    const tagsIds =
      persistedDoc && savedObjectsTagging
        ? savedObjectsTagging.ui.getTagIdsFromReferences(persistedDoc.references)
        : [];
    references = savedObjectsTagging.ui.updateTagsReferences(
      references,
      saveProps.newTags || tagsIds
    );
  }

  const docToSave = getDocToSave(lastKnownDoc, saveProps, references);

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
          displayName: i18n.translate('xpack.lens.app.saveModalType', {
            defaultMessage: 'Lens visualization',
          }),
          lastSavedTitle: lastKnownDoc.title,
          copyOnSave: saveProps.newCopyOnSave,
          isTitleDuplicateConfirmed: saveProps.isTitleDuplicateConfirmed,
        },
        saveProps.onTitleDuplicate,
        {
          client: savedObjectStore,
          ...startServices,
        }
      );
    } catch (e) {
      // ignore duplicate title failure, user notified in save modal
      throw e;
    }
  }
  try {
    // wrap the doc into a serializable state
    const newDoc = fromDocumentToSerializedState(docToSave, {
      timeRange: saveProps.panelTimeRange,
    });

    const shouldNavigateBackToOrigin = saveProps.returnToOrigin && redirectToOrigin;
    const hasRedirect = shouldNavigateBackToOrigin || saveProps.dashboardId;

    // is a redirect was set, prevent the validation on app leave
    if (hasRedirect) {
      // disabling the validation on app leave because the document has been saved.
      onAppLeave?.((actions) => {
        return actions.default();
      });
    }

    if (shouldNavigateBackToOrigin) {
      redirectToOrigin({ state: newDoc.attributes, isCopied: saveProps.newCopyOnSave });
      return;
    }
    if (saveProps.dashboardId) {
      redirectToDashboard({
        embeddableInput: newDoc,
        dashboardId: saveProps.dashboardId,
        stateTransfer,
        originatingApp: props.originatingApp,
        getOriginatingPath: props.getOriginatingPath,
      });
      return;
    }
    // const newInput = stateTransfer;
    // // let newInput = (await attributeService.wrapAttributes(
    // //   docToSave,
    // //   options.saveToLibrary,
    // //   originalInput
    // // )) as LensEmbeddableInput;
    // const newDoc = {
    //   ...docToSave,
    //   timeRange: saveProps.panelTimeRange ?? docToSave.timeRange,
    // };
    // if (saveProps.panelTimeRange) {
    //   newInput = {
    //     ...newInput,
    //     timeRange: saveProps.panelTimeRange,
    //   };
    // }
    // if (saveProps.returnToOrigin && redirectToOrigin) {
    //   // disabling the validation on app leave because the document has been saved.
    //   onAppLeave?.((actions) => {
    //     return actions.default();
    //   });
    //   redirectToOrigin({ input: newDoc, isCopied: saveProps.newCopyOnSave });
    //   return;
    // } else if (saveProps.dashboardId) {
    //   // disabling the validation on app leave because the document has been saved.
    //   onAppLeave?.((actions) => {
    //     return actions.default();
    //   });
    //   redirectToDashboard({
    //     embeddableInput: newDoc,
    //     dashboardId: saveProps.dashboardId,
    //     stateTransfer,
    //     originatingApp: props.originatingApp,
    //     getOriginatingPath: props.getOriginatingPath,
    //   });
    //   return;
    // }

    notifications.toasts.addSuccess(
      i18n.translate('xpack.lens.app.saveVisualization.successNotificationText', {
        defaultMessage: `Saved ''{visTitle}''`,
        values: {
          visTitle: docToSave.title,
        },
      })
    );

    if (newDoc.savedObjectId && newDoc.savedObjectId !== originalSavedObjectId) {
      chrome.recentlyAccessed.add(
        getFullPath(newDoc.savedObjectId),
        docToSave.title,
        newDoc.savedObjectId
      );

      // remove editor state so the connection is still broken after reload
      stateTransfer.clearEditorState?.(APP_ID);
      if (textBasedLanguageSave) {
        switchDatasource?.();
        application.navigateToApp('lens', { path: '/' });
      } else {
        redirectTo?.(newDoc.savedObjectId);
      }
      return { isLinkedToOriginatingApp: false };
    }

    // const newDoc = {
    //   ...docToSave,
    //   ...newInput,
    // };

    return {
      persistedDoc: newDoc.attributes,
      isLinkedToOriginatingApp: false,
    };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.dir(e);
    throw e;
  }
};

export function removePinnedFilters(doc?: LensDocument) {
  if (!doc) return undefined;
  return {
    ...doc,
    state: {
      ...doc.state,
      filters: (doc.state?.filters || []).filter((filter) => !isFilterPinned(filter)),
    },
  };
}

// eslint-disable-next-line import/no-default-export
export default SaveModalContainer;
