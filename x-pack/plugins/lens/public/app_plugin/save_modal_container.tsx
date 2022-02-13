/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { METRIC_TYPE } from '@kbn/analytics';
import { isFilterPinned } from '@kbn/es-query';

import type { SavedObjectReference } from 'kibana/public';
import { SaveModal } from './save_modal';
import type { LensAppProps, LensAppServices } from './types';
import type { SaveProps } from './app';
import { Document, checkForDuplicateTitle } from '../persistence';
import type { LensByReferenceInput, LensEmbeddableInput } from '../embeddable';
import { APP_ID, getFullPath, LENS_EMBEDDABLE_TYPE } from '../../common';
import { trackUiEvent } from '../lens_ui_telemetry';
import type { LensAppState } from '../state_management';
import { getPersisted } from '../state_management/init_middleware/load_initial';

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
  lastKnownDoc: initLastKnownDoc,
  lensServices,
}: SaveModalContainerProps) {
  let title = '';
  let description;
  let savedObjectId;
  const [lastKnownDoc, setLastKnownDoc] = useState<Document | undefined>(initLastKnownDoc);
  if (lastKnownDoc) {
    title = lastKnownDoc.title;
    description = lastKnownDoc.description;
    savedObjectId = lastKnownDoc.savedObjectId;
  }

  const { attributeService, savedObjectsTagging, application, dashboardFeatureFlag } = lensServices;

  useEffect(() => {
    setLastKnownDoc(initLastKnownDoc);
  }, [initLastKnownDoc]);

  useEffect(() => {
    let isMounted = true;

    if (initialInput) {
      getPersisted({
        initialInput,
        lensServices,
      }).then((persisted) => {
        if (persisted?.doc && isMounted) setLastKnownDoc(persisted.doc);
      });
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

const getDocToSave = (
  lastKnownDoc: Document,
  saveProps: SaveProps,
  references: SavedObjectReference[]
) => {
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

  if (!lastKnownDoc) {
    return;
  }

  if (usageCollection) {
    usageCollection.reportUiCounter(originatingApp || 'visualize', METRIC_TYPE.CLICK, 'lens:save');
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

export function removePinnedFilters(doc?: Document) {
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
