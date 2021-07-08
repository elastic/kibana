/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiFlyout, EuiFlyoutHeader, EuiFlyoutBody, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import {
  SavedObjectFinderUi,
  SavedObjectMetaData,
} from '../../../../../../src/plugins/saved_objects/public/';
import { usePlatformService, useServices } from '../../services';

const strings = {
  getNoItemsText: () =>
    i18n.translate('xpack.canvas.embedObject.noMatchingObjectsMessage', {
      defaultMessage: 'No matching objects found.',
    }),
  getTitleText: () =>
    i18n.translate('xpack.canvas.embedObject.titleText', {
      defaultMessage: 'Add from Kibana',
    }),
};
export interface Props {
  onClose: () => void;
  onSelect: (id: string, embeddableType: string) => void;
  availableEmbeddables: string[];
}

export const AddEmbeddableFlyout: FC<Props> = ({ onSelect, availableEmbeddables, onClose }) => {
  const services = useServices();
  const platformService = usePlatformService();
  const { embeddables } = services;
  const { getEmbeddableFactories } = embeddables;
  const { getSavedObjects, getUISettings } = platformService;

  const onAddPanel = (id: string, savedObjectType: string, name: string) => {
    const embeddableFactories = getEmbeddableFactories();

    // Find the embeddable type from the saved object type
    const found = Array.from(embeddableFactories).find((embeddableFactory) => {
      return Boolean(
        embeddableFactory.savedObjectMetaData &&
          embeddableFactory.savedObjectMetaData.type === savedObjectType
      );
    });

    const foundEmbeddableType = found ? found.type : 'unknown';

    onSelect(id, foundEmbeddableType);
  };

  const embeddableFactories = getEmbeddableFactories();

  const availableSavedObjects = Array.from(embeddableFactories)
    .filter((factory) => {
      return availableEmbeddables.includes(factory.type);
    })
    .map((factory) => factory.savedObjectMetaData)
    .filter<SavedObjectMetaData<{}>>(function (
      maybeSavedObjectMetaData
    ): maybeSavedObjectMetaData is SavedObjectMetaData<{}> {
      return maybeSavedObjectMetaData !== undefined;
    });

  return (
    <EuiFlyout ownFocus onClose={onClose} data-test-subj="dashboardAddPanel">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{strings.getTitleText()}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <SavedObjectFinderUi
          onChoose={onAddPanel}
          savedObjectMetaData={availableSavedObjects}
          showFilter={true}
          noItemsMessage={strings.getNoItemsText()}
          savedObjects={getSavedObjects()}
          uiSettings={getUISettings()}
        />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
