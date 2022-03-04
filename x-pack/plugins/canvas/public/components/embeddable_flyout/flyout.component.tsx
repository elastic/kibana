/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback } from 'react';
import { EuiFlyout, EuiFlyoutHeader, EuiFlyoutBody, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import {
  SavedObjectFinderUi,
  SavedObjectMetaData,
} from '../../../../../../src/plugins/saved_objects/public/';
import { useEmbeddablesService, usePlatformService } from '../../services';

const strings = {
  getNoItemsText: () =>
    i18n.translate('xpack.canvas.embedObject.noMatchingObjectsMessage', {
      defaultMessage: 'No matching objects found.',
    }),
  getTitleText: () =>
    i18n.translate('xpack.canvas.embedObject.titleText', {
      defaultMessage: 'Add from library',
    }),
};
export interface Props {
  onClose: () => void;
  onSelect: (id: string, embeddableType: string, isByValueEnabled?: boolean) => void;
  availableEmbeddables: string[];
  isByValueEnabled?: boolean;
}

export const AddEmbeddableFlyout: FC<Props> = ({
  onSelect,
  availableEmbeddables,
  onClose,
  isByValueEnabled,
}) => {
  const embeddablesService = useEmbeddablesService();
  const platformService = usePlatformService();
  const { getEmbeddableFactories } = embeddablesService;
  const { getSavedObjects, getUISettings } = platformService;

  const onAddPanel = useCallback(
    (id: string, savedObjectType: string) => {
      const embeddableFactories = getEmbeddableFactories();
      // Find the embeddable type from the saved object type
      const found = Array.from(embeddableFactories).find((embeddableFactory) => {
        return Boolean(
          embeddableFactory.savedObjectMetaData &&
            embeddableFactory.savedObjectMetaData.type === savedObjectType
        );
      });

      const foundEmbeddableType = found ? found.type : 'unknown';

      onSelect(id, foundEmbeddableType, isByValueEnabled);
    },
    [isByValueEnabled, getEmbeddableFactories, onSelect]
  );

  const embeddableFactories = getEmbeddableFactories();

  const availableSavedObjects = Array.from(embeddableFactories)
    .filter((factory) => isByValueEnabled || availableEmbeddables.includes(factory.type))
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
