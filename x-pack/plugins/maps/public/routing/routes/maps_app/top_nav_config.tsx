/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { Adapters } from 'src/plugins/inspector/public';
import { SavedObjectSaveOpts } from 'src/plugins/saved_objects/public';
import {
  getCoreChrome,
  getMapsCapabilities,
  getInspector,
  getToasts,
  getCoreI18n,
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

export function getTopNavConfig({
  savedMap,
  isOpenSettingsDisabled,
  isSaveDisabled,
  closeFlyout,
  enableFullScreen,
  openMapSettings,
  inspectorAdapters,
  setBreadcrumbs,
  originatingApp,
}: {
  savedMap: ISavedGisMap;
  isOpenSettingsDisabled: boolean;
  isSaveDisabled: boolean;
  closeFlyout: () => void;
  enableFullScreen: () => void;
  openMapSettings: () => void;
  inspectorAdapters: Adapters;
  setBreadcrumbs: () => void;
  originatingApp?: string;
}) {
  const topNavConfigs = [];

  const hasWritePermissions = getMapsCapabilities().save;

  if (hasWritePermissions && savedMap.id && originatingApp) {
    topNavConfigs.push({
      id: 'saveAndReturn',
      label: i18n.translate('xpack.maps.topNav.fullScreenButtonLabel', {
        defaultMessage: 'Save and return',
      }),
      emphasize: true,
      iconType: 'check',
      run: () => {
        /* if (isSaveable && lastKnownDoc) {
          runSave({
            newTitle: lastKnownDoc.title,
            newCopyOnSave: false,
            isTitleDuplicateConfirmed: false,
            returnToOrigin: true,
          });
        }*/
      },
      testId: 'mapSaveAndReturnButton',
    });
  }

  if (hasWritePermissions) {
    topNavConfigs.push({
      id: 'save',
      label: i18n.translate('xpack.maps.topNav.saveMapButtonLabel', {
        defaultMessage: `save`,
      }),
      description: i18n.translate('xpack.maps.topNav.saveMapDescription', {
        defaultMessage: `Save map`,
      }),
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
      run: async () => {
        const onSave = ({
          newTitle,
          newCopyOnSave,
          isTitleDuplicateConfirmed,
          onTitleDuplicate,
        }: OnSaveProps) => {
          const currentTitle = savedMap.title;
          savedMap.title = newTitle;
          savedMap.copyOnSave = newCopyOnSave;
          const saveOptions: SavedObjectSaveOpts = {
            confirmOverwrite: false,
            isTitleDuplicateConfirmed,
            onTitleDuplicate,
          };
          return doSave(savedMap, saveOptions, closeFlyout, setBreadcrumbs).then((response) => {
            // If the save wasn't successful, put the original values back.
            if (!response.id || response.error) {
              savedMap.title = currentTitle;
            }
            return response;
          });
        };

        const saveModal = (
          <SavedObjectSaveModalOrigin
            originatingApp={originatingApp}
            onSave={onSave}
            onClose={() => {}}
            documentInfo={{
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
    }
  );

  return topNavConfigs;
}

async function doSave(
  savedMap: ISavedGisMap,
  saveOptions: SavedObjectSaveOpts,
  closeFlyout: () => void,
  setBreadcrumbs: () => void
) {
  closeFlyout();
  savedMap.syncWithStore();
  let id;

  try {
    id = await savedMap.save(saveOptions);
    getCoreChrome().docTitle.change(savedMap.title);
  } catch (err) {
    getToasts().addDanger({
      title: i18n.translate('xpack.maps.topNav.saveErrorMessage', {
        defaultMessage: `Error on saving '{title}'`,
        values: { title: savedMap.title },
      }),
      text: err.message,
      'data-test-subj': 'saveMapError',
    });
    return { error: err };
  }

  if (id) {
    goToSpecifiedPath(`/map/${id}${window.location.hash}`);
    setBreadcrumbs();

    // coreStart.application.navigateToApp(originatingApp);

    getToasts().addSuccess({
      title: i18n.translate('xpack.maps.topNav.saveSuccessMessage', {
        defaultMessage: `Saved '{title}'`,
        values: { title: savedMap.title },
      }),
      'data-test-subj': 'saveMapSuccess',
    });
  }
  return { id };
}
