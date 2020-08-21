/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { Adapters } from 'src/plugins/inspector/public';
import {
  getCoreChrome,
  getMapsCapabilities,
  getInspector,
  getToasts,
  getCoreI18n,
  getNavigateToApp,
} from '../../../kibana_services';
import {
  SavedObjectSaveModalOrigin,
  OnSaveProps,
  showSaveModal,
} from '../../../../../../../src/plugins/saved_objects/public';
import { MAP_SAVED_OBJECT_TYPE } from '../../../../common/constants';
// @ts-expect-error
import { goToSpecifiedPath } from '../../maps_router';
import { ISavedGisMap } from '../../bootstrap/services/saved_gis_map';
import { EmbeddableStateTransfer } from '../../../../../../../src/plugins/embeddable/public';

export function getTopNavConfig({
  savedMap,
  isOpenSettingsDisabled,
  isSaveDisabled,
  enableFullScreen,
  openMapSettings,
  inspectorAdapters,
  setBreadcrumbs,
  stateTransfer,
  originatingApp,
  cutOriginatingAppConnection,
}: {
  savedMap: ISavedGisMap;
  isOpenSettingsDisabled: boolean;
  isSaveDisabled: boolean;
  enableFullScreen: () => void;
  openMapSettings: () => void;
  inspectorAdapters: Adapters;
  setBreadcrumbs: () => void;
  stateTransfer?: EmbeddableStateTransfer;
  originatingApp?: string;
  cutOriginatingAppConnection: () => void;
}) {
  const topNavConfigs = [];
  const isNewMap = !savedMap.id;
  const hasWritePermissions = getMapsCapabilities().save;
  const hasSaveAndReturnConfig = hasWritePermissions && !isNewMap && originatingApp;

  async function onSave({
    newDescription,
    newTitle,
    newCopyOnSave,
    isTitleDuplicateConfirmed,
    onTitleDuplicate,
    returnToOrigin,
  }: OnSaveProps & { returnToOrigin: boolean }) {
    const prevTitle = savedMap.title;
    const prevDescription = savedMap.description;
    savedMap.title = newTitle;
    savedMap.description = newDescription;
    savedMap.copyOnSave = newCopyOnSave;

    let id;
    try {
      savedMap.syncWithStore();
      id = await savedMap.save({
        confirmOverwrite: false,
        isTitleDuplicateConfirmed,
        onTitleDuplicate,
      });
      // id not returned when save fails because of duplicate title check.
      // return and let user confirm duplicate title.
      if (!id) {
        return {};
      }
    } catch (err) {
      getToasts().addDanger({
        title: i18n.translate('xpack.maps.topNav.saveErrorMessage', {
          defaultMessage: `Error saving '{title}'`,
          values: { title: savedMap.title },
        }),
        text: err.message,
        'data-test-subj': 'saveMapError',
      });
      // If the save wasn't successful, put the original values back.
      savedMap.title = prevTitle;
      savedMap.description = prevDescription;
      return { error: err };
    }

    getToasts().addSuccess({
      title: i18n.translate('xpack.maps.topNav.saveSuccessMessage', {
        defaultMessage: `Saved '{title}'`,
        values: { title: savedMap.title },
      }),
      'data-test-subj': 'saveMapSuccess',
    });

    getCoreChrome().docTitle.change(savedMap.title);
    setBreadcrumbs();
    goToSpecifiedPath(`/map/${id}${window.location.hash}`);

    const newlyCreated = newCopyOnSave || isNewMap;
    if (newlyCreated && !returnToOrigin) {
      cutOriginatingAppConnection();
    } else if (!!originatingApp && returnToOrigin) {
      if (newlyCreated && stateTransfer) {
        stateTransfer.navigateToWithEmbeddablePackage(originatingApp, {
          state: { id, type: MAP_SAVED_OBJECT_TYPE },
        });
      } else {
        getNavigateToApp()(originatingApp);
      }
    }

    return { id };
  }

  if (hasSaveAndReturnConfig) {
    topNavConfigs.push({
      id: 'saveAndReturn',
      label: i18n.translate('xpack.maps.topNav.saveAndReturnButtonLabel', {
        defaultMessage: 'Save and return',
      }),
      emphasize: true,
      iconType: 'check',
      run: () => {
        onSave({
          newTitle: savedMap.title ? savedMap.title : '',
          newDescription: savedMap.description ? savedMap.description : '',
          newCopyOnSave: false,
          isTitleDuplicateConfirmed: false,
          returnToOrigin: true,
          onTitleDuplicate: () => {},
        });
      },
      testId: 'mapSaveAndReturnButton',
    });
  }

  if (hasWritePermissions) {
    topNavConfigs.push({
      id: 'save',
      label: hasSaveAndReturnConfig
        ? i18n.translate('xpack.maps.topNav.saveAsButtonLabel', {
            defaultMessage: 'Save as',
          })
        : i18n.translate('xpack.maps.topNav.saveMapButtonLabel', {
            defaultMessage: `save`,
          }),
      description: i18n.translate('xpack.maps.topNav.saveMapDescription', {
        defaultMessage: `Save map`,
      }),
      emphasize: !hasSaveAndReturnConfig,
      testId: 'mapSaveButton',
      disableButton() {
        return isSaveDisabled;
      },
      tooltip() {
        if (isSaveDisabled) {
          return i18n.translate('xpack.maps.topNav.saveMapDisabledButtonTooltip', {
            defaultMessage: 'Confirm or Cancel your layer changes before saving',
          });
        }
      },
      run: () => {
        const saveModal = (
          <SavedObjectSaveModalOrigin
            originatingApp={originatingApp}
            getAppNameFromId={stateTransfer?.getAppNameFromId}
            onSave={onSave}
            onClose={() => {}}
            documentInfo={{
              description: savedMap.description,
              id: savedMap.id,
              title: savedMap.title,
            }}
            objectType={i18n.translate('xpack.maps.topNav.saveModalType', {
              defaultMessage: 'map',
            })}
          />
        );
        showSaveModal(saveModal, getCoreI18n().Context);
      },
    });
  }

  topNavConfigs.push(
    {
      id: 'mapSettings',
      label: i18n.translate('xpack.maps.topNav.openSettingsButtonLabel', {
        defaultMessage: `Map settings`,
      }),
      description: i18n.translate('xpack.maps.topNav.openSettingsDescription', {
        defaultMessage: `Open map settings`,
      }),
      testId: 'openSettingsButton',
      disableButton() {
        return isOpenSettingsDisabled;
      },
      run() {
        openMapSettings();
      },
    },
    {
      id: 'inspect',
      label: i18n.translate('xpack.maps.topNav.openInspectorButtonLabel', {
        defaultMessage: `inspect`,
      }),
      description: i18n.translate('xpack.maps.topNav.openInspectorDescription', {
        defaultMessage: `Open Inspector`,
      }),
      testId: 'openInspectorButton',
      run() {
        getInspector().open(inspectorAdapters, {});
      },
    },
    {
      id: 'full-screen',
      label: i18n.translate('xpack.maps.topNav.fullScreenButtonLabel', {
        defaultMessage: `full screen`,
      }),
      description: i18n.translate('xpack.maps.topNav.fullScreenDescription', {
        defaultMessage: `full screen`,
      }),
      testId: 'mapsFullScreenMode',
      run() {
        getCoreChrome().setIsVisible(false);
        enableFullScreen();
      },
    }
  );

  return topNavConfigs;
}
