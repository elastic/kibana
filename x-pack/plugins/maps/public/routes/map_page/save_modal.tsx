/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { i18n } from '@kbn/i18n';
import { MAP_SAVED_OBJECT_TYPE } from '../../../common/constants';
import {
  getSavedObjectsClient,
  getCoreOverlays,
  getSavedObjectsTagging,
} from '../../kibana_services';
import { SavedMap } from './saved_map';
import {
  checkForDuplicateTitle,
  SavedObjectSaveModalOrigin,
  OnSaveProps,
} from '../../../../../../src/plugins/saved_objects/public';

interface Props {
  savedMap: SavedMap;
  description: string;
}

interface State {
  selectedTags: string[];
}

export class SaveModal extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      selectedTags: props.savedMap.getTags(),
    };
  }

  onTagsSelected(selectedTags: string[]) {
    this.setState({ selectedTags });
  }

  render() {
    const { savedMap } = this.props;
    const savedObjectsTagging = getSavedObjectsTagging();
    const tagSelector = savedObjectsTagging ? (
      <savedObjectsTagging.ui.components.SavedObjectSaveModalTagSelector
        initialSelection={savedMap.getTags()}
        onTagsSelected={this.onTagsSelected}
      />
    ) : undefined;

    return (
      <SavedObjectSaveModalOrigin
        originatingApp={savedMap.getOriginatingApp()}
        getAppNameFromId={savedMap.getAppNameFromId}
        onSave={async (props: OnSaveProps & { returnToOrigin: boolean; newTags?: string[] }) => {
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
            saveByReference: true,
          });
          // showSaveModal wrapper requires onSave to return an object with an id to close the modal after successful save
          return { id: 'id' };
        }}
        onClose={() => {}}
        documentInfo={{
          description: this.props.mapDescription,
          id: savedMap.getSavedObjectId(),
          title: savedMap.getTitle(),
        }}
        objectType={i18n.translate('xpack.maps.topNav.saveModalType', {
          defaultMessage: 'map',
        })}
      />
    );
  }
}
