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
  getCoreI18n,
  getSavedObjectsClient,
  getCoreOverlays,
  getSavedObjectsTagging,
} from '../../kibana_services';
import {
  checkForDuplicateTitle,
  SavedObjectSaveModalOrigin,
  OnSaveProps,
  showSaveModal,
} from '../../../../../../src/plugins/saved_objects/public';
import { MAP_SAVED_OBJECT_TYPE } from '../../../common/constants';
import { SavedMap } from './saved_map';
import { getMapEmbeddableDisplayName } from '../../../common/i18n_getters';

export function getTopNavConfig({
  savedMap,
  isOpenSettingsDisabled,
  isSaveDisabled,
  enableFullScreen,
  openMapSettings,
  inspectorAdapters,
}: {
  savedMap: SavedMap;
  isOpenSettingsDisabled: boolean;
  isSaveDisabled: boolean;
  enableFullScreen: () => void;
  openMapSettings: () => void;
  inspectorAdapters: Adapters;
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
    const hasSaveAndReturnConfig = savedMap.hasSaveAndReturnConfig();
    const mapDescription = savedMap.getAttributes().description
      ? savedMap.getAttributes().description!
      : '';
    const saveAndReturnButtonLabel = savedMap.isByValue()
      ? i18n.translate('xpack.maps.topNav.saveToMapsButtonLabel', {
          defaultMessage: 'Save to maps',
        })
      : i18n.translate('xpack.maps.topNav.saveAsButtonLabel', {
          defaultMessage: 'Save as',
        });

    topNavConfigs.push({
      id: 'save',
      iconType: hasSaveAndReturnConfig ? undefined : 'save',
      label: hasSaveAndReturnConfig
        ? saveAndReturnButtonLabel
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
        let selectedTags = savedMap.getTags();
        function onTagsSelected(newTags: string[]) {
          selectedTags = newTags;
        }

        const savedObjectsTagging = getSavedObjectsTagging();
        const tagSelector = savedObjectsTagging ? (
          <savedObjectsTagging.ui.components.SavedObjectSaveModalTagSelector
            initialSelection={savedMap.getTags()}
            onTagsSelected={onTagsSelected}
          />
        ) : undefined;

        const saveModal = (
          <SavedObjectSaveModalOrigin
            originatingApp={savedMap.getOriginatingApp()}
            getAppNameFromId={savedMap.getAppNameFromId}
            onSave={async (props: OnSaveProps & { returnToOrigin: boolean }) => {
              try {
                await checkForDuplicateTitle(
                  {
                    id: props.newCopyOnSave ? undefined : savedMap.getSavedObjectId(),
                    title: props.newTitle,
                    copyOnSave: props.newCopyOnSave,
                    lastSavedTitle: savedMap.getSavedObjectId() ? savedMap.getTitle() : '',
                    getEsType: () => MAP_SAVED_OBJECT_TYPE,
                    getDisplayName: getMapEmbeddableDisplayName,
                  },
                  props.isTitleDuplicateConfirmed,
                  props.onTitleDuplicate,
                  {
                    savedObjectsClient: getSavedObjectsClient(),
                    overlays: getCoreOverlays(),
                  }
                );
              } catch (e) {
                // ignore duplicate title failure, user notified in save modal
                return {};
              }

              await savedMap.save({
                ...props,
                newTags: selectedTags,
                saveByReference: true,
              });
              // showSaveModal wrapper requires onSave to return an object with an id to close the modal after successful save
              return { id: 'id' };
            }}
            onClose={() => {}}
            documentInfo={{
              description: mapDescription,
              id: savedMap.getSavedObjectId(),
              title: savedMap.getTitle(),
            }}
            objectType={i18n.translate('xpack.maps.topNav.saveModalType', {
              defaultMessage: 'map',
            })}
            options={tagSelector}
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
          savedMap.save({
            newTitle: savedMap.getTitle(),
            newDescription: mapDescription,
            newCopyOnSave: false,
            isTitleDuplicateConfirmed: false,
            returnToOrigin: true,
            onTitleDuplicate: () => {},
            saveByReference: !savedMap.isByValue(),
          });
        },
        testId: 'mapSaveAndReturnButton',
      });
    }
  }

  return topNavConfigs;
}
