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
  getIsAllowByValueEmbeddables,
} from '../../../kibana_services';
import {
  SavedObjectSaveModalOrigin,
  OnSaveProps,
  showSaveModal,
} from '../../../../../../../src/plugins/saved_objects/public';
import { MAP_SAVED_OBJECT_TYPE } from '../../../../common/constants';
import { goToSpecifiedPath } from '../../render_app';
import { SavedMap } from './saved_map';
import { EmbeddableStateTransfer } from '../../../../../../../src/plugins/embeddable/public';

function getSaveAndReturnButtonLabel() {
  return getIsAllowByValueEmbeddables()
    ? i18n.translate('xpack.maps.topNav.saveToMaps', {
        defaultMessage: 'Save to Maps',
      })
    : i18n.translate('xpack.maps.topNav.saveAsButtonLabel', {
        defaultMessage: 'Save as',
      });
}

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
}: {
  savedMap: SavedMap;
  isOpenSettingsDisabled: boolean;
  isSaveDisabled: boolean;
  enableFullScreen: () => void;
  openMapSettings: () => void;
  inspectorAdapters: Adapters;
  setBreadcrumbs: (title: string) => void;
  stateTransfer?: EmbeddableStateTransfer;
}) {
  const topNavConfigs = [];

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

  if (getMapsCapabilities().save) {
    const hasSaveAndReturnConfig = originatingApp;
    const mapSavedObjectAttributes = savedMap.getAttributes();

    topNavConfigs.push({
      id: 'save',
      iconType: hasSaveAndReturnConfig ? undefined : 'save',
      label: hasSaveAndReturnConfig
        ? getSaveAndReturnButtonLabel()
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
            onSave={(props: OnSaveProps & { returnToOrigin: boolean }) => {
              return savedMap.save({
                ...props,
                saveByReference: true,
                originatingApp,
                stateTransfer,
                setBreadcrumbs,
              });
            }}
            onClose={() => {}}
            documentInfo={{
              description: mapSavedObjectAttributes.description,
              id: savedMap.getSavedObjectId(),
              title: mapSavedObjectAttributes.title,
            }}
            objectType={i18n.translate('xpack.maps.topNav.saveModalType', {
              defaultMessage: 'map',
            })}
          />
        );
        showSaveModal(saveModal, getCoreI18n().Context);
      },
    });

    if (hasSaveAndReturnConfig) {
      topNavConfigs.push({
        id: 'saveAndReturn',
        label: i18n.translate('xpack.maps.topNav.saveAndReturnButtonLabel', {
          defaultMessage: 'Save and return',
        }),
        emphasize: true,
        iconType: 'checkInCircleFilled',
        run: () => {
          return savedMap.save({
            newTitle: mapSavedObjectAttributes.title ? mapSavedObjectAttributes.title : '',
            newDescription: mapSavedObjectAttributes.description
              ? mapSavedObjectAttributes.description
              : '',
            newCopyOnSave: false,
            isTitleDuplicateConfirmed: false,
            returnToOrigin: true,
            onTitleDuplicate: () => {},
            saveByReference: false,
            originatingApp,
            stateTransfer,
            setBreadcrumbs,
          });
        },
        testId: 'mapSaveAndReturnButton',
      });
    }
  }

  return topNavConfigs;
}
